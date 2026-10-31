/* Tester une vraie mise à jour depuis un ZIP antérieur sur la même origine et en sous-dossier.
 * Utilisation : node tests/migration.cjs /chemin/VigieAuto-v1.3.2.zip
 * Nécessite Python 3 pour extraire l'archive et Playwright/Chromium pour le navigateur.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const root=path.resolve(__dirname,'..');
const previous=path.resolve(process.argv[2] || path.join(root,'..','VigieAuto-v1.3.2.zip'));
const targetVersion=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const fill=(p,n,v)=>p.locator(`#modal [name="${n}"]`).fill(String(v));
const submit=async p=>{await p.locator('#modal button[type=submit]').click();await p.locator('#modal').waitFor({state:'hidden'});};
const go=async (p,route,label)=>{await p.evaluate(r=>{location.hash=r},route);await p.waitForFunction(l=>document.title===`${l} — VigieAuto`,label);};
const db=p=>p.evaluate(async()=>{const {LocalDatabase}=await import('./js/db.js');const d=await new LocalDatabase().open();const rows=await d.readAll();d.db.close();return rows;});
async function serve(directory) {
  const s=http.createServer((req,res)=>{
    let f=path.resolve(directory,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(f!==directory&&!f.startsWith(directory+path.sep))return res.writeHead(403).end();
    if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
    if(!fs.existsSync(f)||!fs.statSync(f).isFile())return res.writeHead(404).end();
    res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(f).pipe(res);
  });
  await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
  return {server:s,base:`http://127.0.0.1:${s.address().port}/VigieAuto/`};
}
(async()=>{
  if(!fs.existsSync(previous))throw new Error(`Archive précédente introuvable : ${previous}`);
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vigie-migration-'));
  const py=spawnSync('python3',['-c','import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',previous,tmp],{encoding:'utf8'});
  if(py.status!==0){fs.rmSync(tmp,{recursive:true,force:true});throw new Error(py.stderr||'Extraction impossible');}
  const previousVersion=JSON.parse(fs.readFileSync(path.join(tmp,'VigieAuto','package.json'),'utf8')).version;
  const served=await serve(tmp);let browser;
  try {
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'fr-FR',timezoneId:'Europe/Paris',acceptDownloads:true});
    await ctx.addInitScript(()=>{window.__calls=0;Object.defineProperty(navigator,'geolocation',{value:{watchPosition(success){window.__calls++;setTimeout(()=>success({coords:{latitude:43.34,longitude:3.21,accuracy:5},timestamp:Date.now()}),10);return 1;},clearWatch(){}}});});
    const p=await ctx.newPage(), errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
    await p.goto(served.base,{waitUntil:'networkidle'});
    await p.locator('[data-action=start-real]').click();await fill(p,'brand','Peugeot');await fill(p,'model','208');await fill(p,'odometer','26000');await submit(p);
    await go(p,'trajets','Trajets');await p.locator('[data-action=add-trip]').first().click();await fill(p,'title','Avant la mise à jour');await fill(p,'distanceKm','12.5');await submit(p);
    await go(p,'documents','Documents');await p.locator('[data-action=add-document]').first().click();await fill(p,'title','Justificatif test');
    await p.locator('#modal [name=file]').setInputFiles({name:'essai.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR1sAAAAASUVORK5CYII=','base64')});await submit(p);
    await go(p,'parametres','Paramètres');await p.locator('input[value=cyan]').check();
    await go(p,'trajets','Trajets');await p.locator('[data-action=start-trip]').first().click();await p.locator('.trip-running').waitFor();
    await go(p,'parametres','Paramètres');const download=p.waitForEvent('download');await p.locator('[data-action=export]').click();
    const oldBackup=JSON.parse(fs.readFileSync(await (await download).path(),'utf8'));assert.ok([2,3].includes(oldBackup.formatVersion));
    const old=await db(p);assert.equal(old.vehicles.length,1);assert.equal(old.documents.length,1);assert.equal(old.trips.length,2);assert.equal(old.trips.filter(x=>x.status==='running').length,1);
    await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
    assert.ok((await p.evaluate(()=>caches.keys())).includes(`cq-auto-app-v${previousVersion}`));

    // Remplacement du code, origine et base inchangées, comme une mise à jour de l'hébergement.
    fs.cpSync(root,path.join(tmp,'VigieAuto'),{recursive:true,force:true,filter:(name)=>!name.split(path.sep).some(s=>['node_modules','.git','__pycache__'].includes(s))});
    await p.evaluate(async ({version, previousVersion})=>{
      const reg=await navigator.serviceWorker.getRegistration();await reg.update();
      const until=Date.now()+15000;
      while(Date.now()<until){
        const names=await caches.keys();
        if(names.includes(`cq-auto-app-v${version}`)&&!names.includes(`cq-auto-app-v${previousVersion}`)&&reg.active?.state==='activated')return;
        await new Promise(resolve=>setTimeout(resolve,50));
      }
      throw new Error('Activation du nouveau service worker trop longue');
    },{version:targetVersion,previousVersion});
    await p.reload({waitUntil:'networkidle'});await go(p,'parametres','Paramètres');
    await p.waitForFunction(v=>document.querySelector('#app-version')?.textContent===v,targetVersion);
    let migrated=await db(p);assert.deepEqual(migrated.vehicles,old.vehicles);assert.deepEqual(migrated.trips,old.trips);assert.deepEqual(migrated.documents,old.documents);
    assert.equal(migrated.settings.find(x=>x.id==='theme').value,'cyan');assert.equal(await p.evaluate(()=>window.__calls),0);
    assert.ok(await p.evaluate(async()=>!!await caches.match(new URL('./js/gps.js',location.href).href)));
    // Restaurer une vraie sauvegarde de la version précédente, en gardant son chrono manuel.
    await p.locator('#import-file').setInputFiles({name:'avant-v2.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(oldBackup))});
    await p.waitForFunction(()=>document.querySelector('#toast')?.textContent.includes('importée'));
    migrated=await db(p);assert.deepEqual(migrated.trips,old.trips);assert.deepEqual(migrated.documents,old.documents);
    await ctx.setOffline(true);await p.reload({waitUntil:'load'});await go(p,'trajets','Trajets');
    await p.locator('[data-action=finish-trip]').first().click();await fill(p,'distanceKm','8.50');await fill(p,'title','Chrono après mise à jour');await submit(p);
    await p.locator('[data-action=prepare-gps]').click();await p.locator('[data-action=activate-gps]').click();await p.locator('[data-action=pause-gps]').waitFor();
    await p.waitForFunction(()=>window.__calls===1);
    assert.deepEqual(errors,[]);await ctx.close();
    console.log(`✓ v${previousVersion} → v${targetVersion} sur la même origine /VigieAuto/ : véhicule, document, thème, historique et chrono conservés`);
    console.log(`✓ sauvegarde v${oldBackup.formatVersion} importée, nouveau cache activé et GPS simulé disponible hors ligne après mise en cache`);
  } finally {
    if(browser)await browser.close();await new Promise(resolve=>served.server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
