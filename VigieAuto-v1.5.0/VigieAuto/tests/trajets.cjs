/* Tests du carnet manuel, de la migration des sauvegardes et du hors-ligne. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
async function serve() {
  const server = http.createServer((req, res) => {
    let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (file !== root && !file.startsWith(root + path.sep)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
    res.writeHead(200, {'content-type': mime[path.extname(file)] || 'application/octet-stream', 'cache-control':'no-store'});
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {server, base:`http://127.0.0.1:${server.address().port}`};
}
const fill = (p, name, value) => p.locator(`#modal [name="${name}"]`).fill(String(value));
const submit = async p => {await p.locator('#modal button[type=submit]').click(); await p.locator('#modal').waitFor({state:'hidden'});};
const title = async (p, value) => p.waitForFunction(v => document.title === `${v} — VigieAuto`, value);
const tab = async (p, route, label) => {await p.locator(`.mobile-nav [data-route="${route}"]`).click(); await title(p, label);};
async function more(p, route, label) {
  await p.locator('.mobile-menu-button').click(); await p.locator(`.quick-action[data-route="${route}"]`).click(); await title(p,label);
}
async function quick(p, action) {await p.locator('.mobile-floating-add').click();await p.locator(`#modal [data-action="${action}"]`).click();}
async function download(p) {const next=p.waitForEvent('download');await p.locator('[data-action=export]').click();return JSON.parse(fs.readFileSync(await (await next).path(),'utf8'));}
async function upload(p, data, expected) {
  await p.locator('#import-file').setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await p.waitForFunction(word=>document.querySelector('#toast')?.textContent.includes(word),expected);
}
async function db(p) {return p.evaluate(async()=>{const {LocalDatabase}=await import('/js/db.js');const d=await new LocalDatabase().open();const x=await d.readAll();d.db.close();return x;});}
(async()=>{
  const {server,base}=await serve(), browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},locale:'fr-FR',timezoneId:'Europe/Paris',acceptDownloads:true});
    await context.addInitScript(()=>{window.__gpsCalls=0;const g=navigator.geolocation;if(g){g.getCurrentPosition=()=>{window.__gpsCalls++};g.watchPosition=()=>{window.__gpsCalls++;return 1}}});
    const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
    await p.goto(base,{waitUntil:'networkidle'});
    await p.locator('[data-action=start-real]').click();await fill(p,'brand','Renault');await fill(p,'model','Clio');await fill(p,'odometer','1000');await submit(p);
    const carA=(await db(p)).vehicles[0].id;
    await tab(p,'trajets','Trajets');assert.match(await p.locator('main').innerText(),/GPS facultatif/);
    assert.match(await p.locator('main').innerText(),/Vos trajets, au même endroit/);
    await quick(p,'add-fill');await fill(p,'odometer','1000');await fill(p,'volume','40');await fill(p,'unitPrice','1.5');await submit(p);
    await quick(p,'add-fill');await fill(p,'odometer','1500');await fill(p,'volume','30');await fill(p,'unitPrice','1.5');await submit(p);
    assert.match(await p.locator('main').innerText(),/0,090 €/);
    await p.locator('[data-action=add-trip]').first().click();await fill(p,'title','Travail');await fill(p,'distanceKm','17.5');await fill(p,'durationMin','35');
    await p.locator('#modal [name=profile]').selectOption('hache');await fill(p,'from','Maison');await fill(p,'to','Bureau');await fill(p,'notes','Climatisation');await submit(p);
    let data=await db(p);assert.equal(data.trips.length,1);assert.equal(data.trips[0].vehicleId,carA);assert.equal(data.trips[0].distanceKm,17.5);assert.equal(data.vehicles[0].odometer,1500);
    assert.match(await p.locator('main').innerText(),/Énergie estimée : environ 1,58 €/);
    await p.locator('[data-action=edit-trip]').first().click();await fill(p,'distanceKm','12.5');await p.locator('#modal [name=profile]').selectOption('roulant');await submit(p);
    await p.locator('[data-filter=trips]').selectOption('hache');assert.match(await p.locator('main').innerText(),/Aucun trajet de ce type/);
    await p.locator('[data-filter=trips]').selectOption('roulant');assert.match(await p.locator('main').innerText(),/Travail/);
    await p.locator('[data-filter=trips]').selectOption('all');
    console.log('✓ trajet passé : création, édition, filtre et estimation de coût sans modifier le compteur');

    await p.locator('[data-action=start-trip]').first().click();await p.locator('.trip-running').waitFor();
    await p.reload({waitUntil:'networkidle'});await p.locator('.trip-running').waitFor();data=await db(p);assert.equal(data.trips.filter(x=>x.status==='running').length,1);
    await p.locator('[data-action=finish-trip]').first().click();await p.locator('#modal [data-action=close-modal]').first().click();assert.equal((await db(p)).trips.filter(x=>x.status==='running').length,1);
    await p.locator('[data-action=finish-trip]').first().click();await fill(p,'title','Chrono A');await fill(p,'distanceKm','20');await fill(p,'durationMin','22');await submit(p);
    data=await db(p);assert.equal(data.trips.filter(x=>x.status==='running').length,0);assert.equal(data.trips.find(x=>x.title==='Chrono A').durationMin,22);
    console.log('✓ chronomètre manuel : persistance, annulation du formulaire, durée modifiable et validation');

    await more(p,'garage','Mes véhicules');await p.locator('[data-action=add-vehicle]').first().click();await fill(p,'brand','Peugeot');await fill(p,'model','208');await fill(p,'odometer','2000');await submit(p);
    data=await db(p);const carB=data.vehicles.find(x=>x.model==='208').id;assert.notEqual(carA,carB);
    await tab(p,'trajets','Trajets');assert.doesNotMatch(await p.locator('main').innerText(),/Travail/);
    await p.locator('[data-action=start-trip]').first().click();await p.locator('.trip-running').waitFor();
    await more(p,'garage','Mes véhicules');await p.locator('.vehicle-tile').filter({hasText:'Renault Clio'}).locator('[data-action=select-vehicle]').click();
    await tab(p,'trajets','Trajets');assert.match(await p.locator('.trip-running').innerText(),/Peugeot 208/);
    await p.locator('[data-action=finish-trip]').first().click();assert.match(await p.locator('#modal').innerText(),/Peugeot 208/);
    await fill(p,'title','Chrono B');await fill(p,'distanceKm','24');await submit(p);
    data=await db(p);assert.equal(data.trips.find(x=>x.title==='Chrono B').vehicleId,carB);
    assert.doesNotMatch(await p.locator('main').innerText(),/Chrono B/);
    await more(p,'garage','Mes véhicules');await p.locator('.vehicle-tile').filter({hasText:'Peugeot 208'}).locator('[data-action=select-vehicle]').click();
    await tab(p,'trajets','Trajets');assert.match(await p.locator('main').innerText(),/Chrono B/);assert.doesNotMatch(await p.locator('main').innerText(),/Travail/);
    console.log('✓ plusieurs véhicules : isolation de l’historique et rattachement du chronomètre au véhicule de départ');

    await tab(p,'parametres','Paramètres');const saved=await download(p);assert.equal(saved.app,'VigieAuto');assert.equal(saved.formatVersion,3);assert.equal(saved.data.trips.length,3);
    const missing=structuredClone(saved);delete missing.data.trips;await upload(p,missing,'Collection manquante : trips');assert.equal((await db(p)).trips.length,3);
    const invalid=structuredClone(saved);invalid.data.trips[0].distanceKm=-5;await upload(p,invalid,'Trajet invalide');assert.equal((await db(p)).trips.length,3);
    const foreign=structuredClone(saved);foreign.data.trips[0].vehicleId='non-existant';await upload(p,foreign,'véhicule absent');assert.equal((await db(p)).trips.length,3);
    const old=structuredClone(saved);old.app='CQ Auto';old.formatVersion=1;delete old.data.trips;await upload(p,old,'importée');assert.equal((await db(p)).trips.length,0);assert.equal((await db(p)).vehicles.length,2);
    await upload(p,saved,'importée');assert.equal((await db(p)).trips.length,3);
    console.log('✓ sauvegarde VigieAuto, import CQ Auto v1, validation stricte et restauration atomique');

    await tab(p,'trajets','Trajets');await p.locator('[data-action=start-trip]').first().click();await p.locator('.trip-running').waitFor();
    await tab(p,'parametres','Paramètres');const withRunning=await download(p);assert.equal(withRunning.data.trips.filter(x=>x.status==='running').length,1);
    await upload(p,withRunning,'importée');assert.equal((await db(p)).trips.filter(x=>x.status==='running').length,1);
    await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
    const manifest=await p.evaluate(async()=>await (await fetch('./manifest.webmanifest')).json());assert.equal(manifest.short_name,'VigieAuto');assert.ok(manifest.icons.some(x=>x.sizes==='512x512'));
    assert.ok(await p.evaluate(async()=>!!(await caches.match('./js/logo.js'))));
    await context.setOffline(true);await p.reload({waitUntil:'load'});await tab(p,'trajets','Trajets');await p.locator('.trip-running').waitFor();
    await p.locator('[data-action=finish-trip]').first().click();await fill(p,'distanceKm','13');await fill(p,'title','Hors ligne');await submit(p);
    assert.match(await p.locator('main').innerText(),/Hors ligne/);assert.equal(await p.evaluate(()=>window.__gpsCalls),0);
    await context.setOffline(false);
    await more(p,'garage','Mes véhicules');await p.locator('.vehicle-tile').filter({hasText:'Peugeot 208'}).locator('[data-action=delete-vehicle]').click();
    await p.locator('.vehicle-tile').filter({hasText:'Peugeot 208'}).waitFor({state:'hidden'});
    data=await db(p);assert.equal(data.vehicles.length,1);assert.ok(data.trips.every(x=>x.vehicleId===carA));assert.equal(data.trips.length,2);
    assert.deepEqual(errors,[]);console.log('✓ sauvegarde du chrono, cache/manifest, utilisation hors ligne, aucun appel GPS et suppression en cascade');
    await context.close();
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
