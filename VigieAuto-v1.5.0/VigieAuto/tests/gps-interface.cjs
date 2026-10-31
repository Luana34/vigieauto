/* GPS simulé : aucun matériel ni trajet réel n'est revendiqué par ces tests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
async function serve() {
  const server = http.createServer((req,res) => {
    let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (file !== root && !file.startsWith(root + path.sep)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file,'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
    res.writeHead(200, {'content-type':mime[path.extname(file)] || 'application/octet-stream','cache-control':'no-store'});
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  return {server, base:`http://127.0.0.1:${server.address().port}`};
}
function installFakeGps() {
  let nextId = 1, sequence = 0, visible = 'visible';
  const base = Date.now() - 10000, active = new Map(), all = new Map();
  window.__gpsFake = {
    watchCalls:0, clearCalls:0, lastId:null,
    emit(lat, lon, accuracy = 5, id = this.lastId) {
      const w = all.get(id); if (!w) throw new Error('watch inconnu');
      const timestamp = Math.min(Date.now() + 5000, base + (++sequence * 1000));
      setTimeout(() => w.success({coords:{latitude:lat,longitude:lon,accuracy}, timestamp}), 0);
    },
    fail(code, id = this.lastId) {
      const w = all.get(id); if (!w) throw new Error('watch inconnu');
      setTimeout(() => w.error({code, message:'erreur GPS simulée'}), 0);
    },
    setVisible(value) { visible = value ? 'visible' : 'hidden'; document.dispatchEvent(new Event('visibilitychange')); },
    activeCount() { return active.size; },
  };
  Object.defineProperty(navigator, 'geolocation', {configurable:true, value:{
    watchPosition(success,error,options) {
      const id=nextId++; const w={success,error,options}; active.set(id,w); all.set(id,w);
      window.__gpsFake.watchCalls++; window.__gpsFake.lastId=id; return id;
    },
    clearWatch(id) { active.delete(id); window.__gpsFake.clearCalls++; },
    getCurrentPosition() { throw new Error('getCurrentPosition inattendu'); },
  }});
  Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>visible});
}
const fill = (p,name,value) => p.locator(`#modal [name="${name}"]`).fill(String(value));
const submit = async p => {await p.locator('#modal button[type=submit]').click();await p.locator('#modal').waitFor({state:'hidden'});};
const tab = async (p, route) => {await p.locator(`.mobile-nav [data-route="${route}"]`).click();await p.waitForFunction(r=>document.querySelector(`.mobile-nav [data-route="${r}"]`)?.getAttribute('aria-current')==='page',route);};
const db = p => p.evaluate(async()=>{const {LocalDatabase}=await import('/js/db.js');const d=await new LocalDatabase().open();const x=await d.readAll();d.db.close();return x;});
async function waitTrip(p,id,{field,value,min}={}) {
  // evaluate attend vraiment la Promesse ; une fonction async dans waitForFunction
  // peut être évaluée comme un objet Promesse immédiatement truthy.
  return p.evaluate(async ({id,field,value,min})=>{
    const {LocalDatabase}=await import('/js/db.js');const d=await new LocalDatabase().open();
    try {
      const deadline=Date.now()+8000;
      while (Date.now()<deadline) {
        const x=await d.getTrip(id);
        if (x && (field===undefined || (min!==undefined ? x[field]>min : x[field]===value))) return x;
        await new Promise(resolve=>setTimeout(resolve,40));
      }
      throw new Error(`Donnée GPS non atteinte : ${field}, min=${min}, valeur=${value}`);
    } finally { d.db.close(); }
  },{id,field,value,min});
}

async function startGps(p) {
  await p.locator('[data-action=prepare-gps]').click();
  assert.match(await p.locator('#modal').innerText(),/aucune coordonnée/i);
  await p.locator('#modal [data-action=activate-gps]').click();
  await p.locator('.trip-running [data-action=pause-gps]').waitFor();
  return (await db(p)).trips.find(x=>x.status==='running');
}
async function exportBackup(p) {
  await tab(p,'parametres');const event=p.waitForEvent('download');await p.locator('[data-action=export]').click();
  return JSON.parse(fs.readFileSync(await (await event).path(),'utf8'));
}
async function importBackup(p,data,expected) {
  await p.locator('#import-file').setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await p.waitForFunction(word=>document.querySelector('#toast')?.textContent.includes(word),expected);
}
(async()=>{
  const {server,base}=await serve(), browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},locale:'fr-FR',timezoneId:'Europe/Paris',acceptDownloads:true});
    await context.addInitScript(installFakeGps);
    const p=await context.newPage(), errors=[];
    p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
    await p.goto(base,{waitUntil:'networkidle'});
    await p.locator('[data-action=start-real]').click();await fill(p,'brand','Renault');await fill(p,'model','Clio');await fill(p,'odometer','1000');await submit(p);
    await tab(p,'trajets');
    assert.equal(await p.evaluate(()=>__gpsFake.watchCalls),0);
    await p.locator('[data-action=prepare-gps]').click();
    assert.match(await p.locator('#modal').innerText(),/distance.*estimation/i);
    await p.locator('#modal [data-action=close-modal]').first().click();
    assert.equal(await p.evaluate(()=>__gpsFake.watchCalls),0);
    const first=await startGps(p), id=first.id;
    assert.equal(first.method,'gps');assert.equal(first.gpsDistanceM,0);assert.equal(first.gpsHasFix,false);
    await p.evaluate(()=>__gpsFake.emit(43.3400,3.2100));await waitTrip(p,id,{field:'gpsHasFix',value:true});
    await p.evaluate(()=>__gpsFake.emit(43.3402,3.2100));await waitTrip(p,id,{field:'gpsDistanceM',min:20});
    let data=await db(p), trip=data.trips.find(x=>x.id===id), before=trip.gpsDistanceM;
    assert.ok(before<25);assert.equal(trip.gpsInterrupted,false);assert.equal(data.vehicles[0].odometer,1000);
    assert.doesNotMatch(JSON.stringify(trip),/latitude|longitude|coords|position|trace/i);
    console.log('✓ autorisation explicite, GPS simulé et aucune coordonnée stockée');

    // Le GPS ne relie pas deux points séparés par un passage en arrière-plan.
    const oldWatch=await p.evaluate(()=>__gpsFake.lastId);
    await p.evaluate(()=>__gpsFake.setVisible(false));
    await p.waitForFunction(()=>__gpsFake.activeCount()===0);
    await waitTrip(p,id,{field:'gpsInterrupted',value:true});
    await p.evaluate(old=>__gpsFake.emit(44,4,5,old),oldWatch); // callback tardif ignoré
    await p.evaluate(()=>__gpsFake.setVisible(true));
    await p.waitForFunction(()=>__gpsFake.watchCalls===2 && __gpsFake.activeCount()===1);
    await p.evaluate(()=>__gpsFake.emit(43.3800,3.2100));
    await p.waitForFunction(()=>document.querySelector('[data-gps-status]')?.textContent.includes('Mesure en cours'));
    assert.equal((await db(p)).trips.find(x=>x.id===id).gpsDistanceM,before);
    await p.evaluate(()=>__gpsFake.emit(43.3802,3.2100));await waitTrip(p,id,{field:'gpsDistanceM',min:before+20});
    trip=(await db(p)).trips.find(x=>x.id===id); assert.ok(trip.gpsDistanceM<50); assert.equal(trip.gpsInterrupted,true);
    const prior=trip.gpsDistanceM;
    await p.evaluate(()=>__gpsFake.emit(43.382,3.2100,90));
    await p.locator('[data-gps-status]').getByText(/imprécise/).waitFor();
    assert.equal((await db(p)).trips.find(x=>x.id===id).gpsDistanceM,prior);
    console.log('✓ mise en pause masquée, reprise visible, signal imprécis et aucun trajet fictif entre segments');

    // Autre onglet : le verrou évite une deuxième mesure et une validation concurrente.
    const p2=await context.newPage();p2.on('pageerror',e=>errors.push(e.message));p2.on('dialog',d=>d.accept());
    await p2.goto(base+'/#trajets',{waitUntil:'networkidle'});
    await p2.locator('[data-action=resume-gps]').click();
    await p2.locator('[data-gps-status]').getByText(/autre fenêtre/).waitFor();
    assert.equal(await p2.evaluate(()=>__gpsFake.watchCalls),0);
    await p2.locator('[data-action=finish-trip]').first().click();
    await p2.waitForFunction(()=>document.querySelector('#toast')?.textContent.includes('autre fenêtre'));
    assert.equal(await p2.locator('#modal').isVisible(),false);
    await p2.close();
    console.log('✓ verrou GPS entre fenêtres : seconde mesure et validation concurrente bloquées');

    // Contraste et débordement quand le GPS fonctionne.
    for(const width of [320,360,390,768,1440]) {
      await p.setViewportSize({width,height:900});
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`GPS actif à ${width}px`);
    }
    await p.setViewportSize({width:390,height:844});await p.emulateMedia({colorScheme:'dark'});
    await p.locator('[data-action=finish-trip]').first().click();
    assert.ok(Number(await p.locator('#modal [name=distanceKm]').inputValue())>=0.04);
    assert.match(await p.locator('#modal').innerText(),/potentiellement incomplète/);
    await p.locator('#modal [data-action=close-modal]').first().click();
    await p.locator('[data-action=resume-gps]').waitFor();
    await p.locator('[data-action=resume-gps]').click();
    await p.locator('[data-action=pause-gps]').waitFor();
    await p.locator('[data-action=finish-trip]').first().click();
    await fill(p,'title','Essai GPS');await fill(p,'distanceKm','3.21');await submit(p);
    data=await db(p);trip=data.trips.find(x=>x.id===id);
    assert.equal(trip.method,'gps');assert.equal(trip.distanceKm,3.21);assert.equal(trip.gpsInterrupted,true);
    assert.match(await p.locator('main').innerText(),/Essai GPS/);assert.match(await p.locator('main').innerText(),/Mesure interrompue/);
    console.log('✓ estimation préremplie et modifiable, formulaire annulé, historique et écrans 320–1440 px');

    // Une perte de précision sur un trajet intact est persistée comme interruption.
    const imprecise=await startGps(p);
    await p.evaluate(()=>__gpsFake.emit(43.3100,3.2100));await waitTrip(p,imprecise.id,{field:'gpsHasFix',value:true});
    await p.evaluate(()=>__gpsFake.emit(43.3102,3.2100,90));
    await waitTrip(p,imprecise.id,{field:'gpsInterrupted',value:true});
    await p.locator('[data-action=delete-trip]').first().click();await p.locator('.trip-running').waitFor({state:'hidden'});
    console.log('✓ signal imprécis enregistré comme interruption');

    // Export complet, rejet d'un champ contenant une trace et restauration atomique.
    await p.emulateMedia({colorScheme:'light'});
    const running=await startGps(p);
    await p.evaluate(()=>__gpsFake.emit(43.3200,3.2100));await waitTrip(p,running.id,{field:'gpsHasFix',value:true});
    await p.evaluate(()=>__gpsFake.emit(43.3202,3.2100));await waitTrip(p,running.id,{field:'gpsDistanceM',min:20});
    const measured=(await db(p)).trips.find(x=>x.id===running.id).gpsDistanceM;
    await p.evaluate(()=>__gpsFake.fail(2));
    await p.locator('[data-gps-status]').getByText(/Signal GPS indisponible/).waitFor();
    await waitTrip(p,running.id,{field:'gpsInterrupted',value:true});
    await p.evaluate(()=>__gpsFake.emit(43.3300,3.2100));
    await p.waitForFunction(()=>document.querySelector('[data-gps-status]')?.textContent.includes('Mesure en cours'));
    assert.equal((await db(p)).trips.find(x=>x.id===running.id).gpsDistanceM,measured);
    await p.locator('[data-action=pause-gps]').click();await p.locator('[data-action=resume-gps]').waitFor();
    assert.equal(await p.evaluate(()=>__gpsFake.activeCount()),0);
    await p.locator('[data-action=resume-gps]').click();await p.locator('[data-action=pause-gps]').waitFor();
    const saved=await exportBackup(p);assert.equal(saved.formatVersion,3);
    assert.equal(saved.data.trips.find(x=>x.id===running.id).status,'running');
    assert.doesNotMatch(JSON.stringify(saved.data.trips),/latitude|longitude|coords|position|trace/i);
    const invalid=structuredClone(saved);invalid.data.trips.find(x=>x.id===running.id).latitude=43.32;
    await importBackup(p,invalid,'Trajet invalide');assert.equal((await db(p)).trips.length,saved.data.trips.length);
    await importBackup(p,saved,'importée');
    data=await db(p);assert.equal(data.trips.find(x=>x.id===running.id).gpsInterrupted,true);
    assert.equal(await p.evaluate(()=>__gpsFake.activeCount()),0);
    await tab(p,'trajets');await p.locator('[data-action=resume-gps]').waitFor();
    await p.locator('[data-action=resume-gps]').click();await p.locator('[data-action=pause-gps]').waitFor();
    await p.locator('[data-action=delete-trip]').first().click();await p.locator('.trip-running').waitFor({state:'hidden'});
    assert.equal((await db(p)).trips.some(x=>x.id===running.id),false);assert.equal(await p.evaluate(()=>__gpsFake.activeCount()),0);
    console.log('✓ sauvegarde v3 sans trace, import validé, reprise interrompue et suppression sans suivi résiduel');

    // Ancien format 2 et refus de permission : saisie manuelle possible.
    const old=structuredClone(saved);old.formatVersion=2;old.data.trips=old.data.trips.filter(x=>x.status==='complete').map(x=>{
      const y={...x,method:'manual'};delete y.gpsDistanceM;delete y.gpsHasFix;delete y.gpsInterrupted;return y;
    });
    await tab(p,'parametres');await importBackup(p,old,'importée');
    assert.equal((await db(p)).trips.length,1);
    await tab(p,'trajets');const denied=await startGps(p);await p.evaluate(()=>__gpsFake.fail(1));
    await p.locator('[data-gps-status]').getByText(/refusé/).waitFor();
    await p.locator('[data-action=finish-trip]').first().click();await fill(p,'distanceKm','1.23');await fill(p,'title','Manuel après refus');await submit(p);
    trip=(await db(p)).trips.find(x=>x.id===denied.id);assert.equal(trip.distanceKm,1.23);assert.equal(trip.gpsHasFix,false);assert.equal(trip.gpsInterrupted,true);
    console.log('✓ import v2 et permission GPS refusée : le trajet reste terminable manuellement');

    // Après rechargement, la reprise n'est jamais silencieuse ; points déjà enregistrés conservés.
    const reloadTrip=await startGps(p);
    await p.evaluate(()=>__gpsFake.emit(43.3000,3.2100));await waitTrip(p,reloadTrip.id,{field:'gpsHasFix',value:true});
    await p.evaluate(()=>__gpsFake.emit(43.3002,3.2100));await waitTrip(p,reloadTrip.id,{field:'gpsDistanceM',min:20});
    before=(await db(p)).trips.find(x=>x.id===reloadTrip.id).gpsDistanceM;
    await p.reload({waitUntil:'networkidle'});await p.locator('[data-action=resume-gps]').waitFor();
    assert.equal(await p.evaluate(()=>__gpsFake.watchCalls),0);
    trip=(await db(p)).trips.find(x=>x.id===reloadTrip.id);assert.equal(trip.gpsDistanceM,before);assert.equal(trip.gpsInterrupted,true);
    await p.locator('[data-action=resume-gps]').click();await p.locator('[data-action=pause-gps]').waitFor();
    const staleWatch=await p.evaluate(()=>__gpsFake.lastId);
    await p.locator('[data-action=delete-trip]').first().click();await p.locator('.trip-running').waitFor({state:'hidden'});
    await p.evaluate(old=>__gpsFake.emit(43.301,3.21,5,old),staleWatch);
    await p.waitForFunction(()=>__gpsFake.activeCount()===0);
    assert.equal((await db(p)).trips.some(x=>x.id===reloadTrip.id),false);
    console.log('✓ rechargement sans reprise automatique, distance préservée et anciens callbacks ignorés');

    await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
    assert.ok(await p.evaluate(async()=>!!(await caches.match('./js/gps.js'))));
    await context.setOffline(true);await p.reload({waitUntil:'load'});await tab(p,'trajets');
    const offlineTrip=await startGps(p);
    await p.evaluate(()=>__gpsFake.emit(43.29,3.21));await waitTrip(p,offlineTrip.id,{field:'gpsHasFix',value:true});
    await p.locator('[data-action=delete-trip]').first().click();await p.locator('.trip-running').waitFor({state:'hidden'});
    await context.setOffline(false);
    console.log('✓ application et GPS simulé utilisables hors ligne après mise en cache');
    assert.deepEqual(errors,[]);
    await context.close();

    // API absente : une explication est visible dans le dialogue, sans créer de trajet.
    const unsupported=await browser.newContext({viewport:{width:390,height:844}});
    await unsupported.addInitScript(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:undefined}));
    const q=await unsupported.newPage();q.on('dialog',d=>d.accept());await q.goto(base,{waitUntil:'networkidle'});
    await q.locator('[data-action=start-real]').click();await fill(q,'brand','Test');await fill(q,'model','Auto');await fill(q,'odometer','1');await submit(q);await tab(q,'trajets');
    await q.locator('[data-action=prepare-gps]').click();assert.match(await q.locator('#modal').innerText(),/GPS indisponible/);
    assert.equal((await db(q)).trips.length,0);await unsupported.close();
    console.log('✓ GPS non pris en charge : message explicite et mode manuel conservé');

    const withoutLocks=await browser.newContext({viewport:{width:390,height:844}});
    await withoutLocks.addInitScript(installFakeGps);
    await withoutLocks.addInitScript(()=>Object.defineProperty(navigator,'locks',{configurable:true,value:undefined}));
    const w=await withoutLocks.newPage(), withoutErrors=[];w.on('pageerror',e=>withoutErrors.push(e.message));w.on('dialog',d=>d.accept());
    await w.goto(base,{waitUntil:'networkidle'});await w.locator('[data-action=start-real]').click();
    await fill(w,'brand','Test');await fill(w,'model','Sans verrou');await fill(w,'odometer','1');await submit(w);await tab(w,'trajets');
    const unlockedTrip=await startGps(w);await w.evaluate(()=>__gpsFake.emit(43.34,3.21));
    await waitTrip(w,unlockedTrip.id,{field:'gpsHasFix',value:true});
    await w.locator('[data-action=delete-trip]').first().click();await w.locator('.trip-running').waitFor({state:'hidden'});
    assert.deepEqual(withoutErrors,[]);await withoutLocks.close();
    console.log('✓ navigateur sans Web Locks : le suivi fonctionne en recommandant une seule fenêtre');

    // L'API native de Chromium est également exercée avec une position et une permission émulées.
    const native=await browser.newContext({viewport:{width:390,height:844},permissions:['geolocation'],geolocation:{latitude:43.3400,longitude:3.2100,accuracy:5}});
    const n=await native.newPage(), nativeErrors=[];n.on('pageerror',e=>nativeErrors.push(e.message));n.on('dialog',d=>d.accept());
    await n.goto(base,{waitUntil:'networkidle'});await n.locator('[data-action=start-real]').click();
    await fill(n,'brand','Essai');await fill(n,'model','Chrome');await fill(n,'odometer','5');await submit(n);await tab(n,'trajets');
    const nativeTrip=await startGps(n);await waitTrip(n,nativeTrip.id,{field:'gpsHasFix',value:true});
    assert.equal((await db(n)).trips.find(x=>x.id===nativeTrip.id).gpsDistanceM,0);
    await n.locator('[data-action=finish-trip]').first().click();
    await fill(n,'distanceKm','0.02');await fill(n,'title','Chrome émulé');await submit(n);
    assert.deepEqual(nativeErrors,[]);await native.close();
    console.log('✓ API Geolocation réelle de Chromium avec position et permission émulées');

    // Deux onglets essayant de démarrer en même temps ne créent qu'un seul trajet.
    const race=await browser.newContext({viewport:{width:390,height:844}});const a=await race.newPage(), b=await race.newPage();
    a.on('dialog',d=>d.accept());b.on('dialog',d=>d.accept());await a.goto(base,{waitUntil:'networkidle'});
    await a.locator('[data-action=start-real]').click();await fill(a,'brand','Essai');await fill(a,'model','Concurrence');await fill(a,'odometer','2');await submit(a);
    await a.goto(base+'/#trajets',{waitUntil:'networkidle'});await b.goto(base+'/#trajets',{waitUntil:'networkidle'});
    await Promise.all([a.locator('[data-action=start-trip]').first().click(),b.locator('[data-action=start-trip]').first().click()]);
    await Promise.all([a.locator('.trip-running').waitFor(),b.locator('.trip-running').waitFor()]);
    let raceData=await db(a);assert.equal(raceData.trips.filter(x=>x.status==='running').length,1);
    const staleVehicle=raceData.vehicles[0].id;
    await b.goto(base+'/#garage',{waitUntil:'networkidle'});
    await b.locator('[data-action=delete-vehicle]').first().click();
    await b.locator('.vehicle-tile').waitFor({state:'hidden'});
    raceData=await db(b);assert.equal(raceData.vehicles.length,0);assert.equal(raceData.trips.length,0);
    const rejected=await a.evaluate(async vehicleId=>{const {LocalDatabase}=await import('/js/db.js');const d=await new LocalDatabase().open();try{await d.startTrip({id:'late',vehicleId,status:'running'});return false;}catch(e){return /véhicule/i.test(e.message);}finally{d.db.close();}},staleVehicle);
    assert.equal(rejected,true);await race.close();
    console.log('✓ onglets concurrents : trajet unique, suppression en cascade et refus de véhicule absent');
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
