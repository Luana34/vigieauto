// Parcours réel du formulaire, d’IndexedDB et du cache hors ligne, avec données fictives.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const browserEngine = process.env.VIGIE_BROWSER === 'webkit' ? webkit : chromium;
const root = path.resolve(__dirname, '..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
async function serve(){
 const server=http.createServer((req,res)=>{
  if(server.simulateDisconnect){req.socket.destroy();return;}
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(file!==root&&!file.startsWith(root+path.sep))return res.writeHead(403).end();
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {server,url:`http://127.0.0.1:${server.address().port}/`};
}
const fill=(p,n,v)=>p.locator(`#modal [name="${n}"]`).fill(String(v));
const options=(p,id)=>p.locator(`#${id} option`).evaluateAll(nodes=>nodes.map(n=>n.value));
const submit=async p=>{await p.locator('#modal button[type=submit]').click();await p.locator('#modal').waitFor({state:'hidden'});};
const garage=async p=>{await p.evaluate(()=>location.hash='garage');await p.waitForFunction(()=>document.title==='Mes véhicules — VigieAuto');};
const add=async p=>{await garage(p);await p.locator('[data-action=add-vehicle]').first().click();};
const records=p=>p.evaluate(async()=>{const {LocalDatabase}=await import('./js/db.js');const db=await new LocalDatabase().open();const data=await db.readAll();db.db.close();return data;});
(async()=>{
 const {server,url}=await serve();let browser;
 try {
  browser=await browserEngine.launch(process.env.VIGIE_BROWSER === 'webkit' ? {headless:true} : {headless:true,args:['--no-sandbox']});
  const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'fr-FR',timezoneId:'Europe/Paris',acceptDownloads:true});
  const p=await ctx.newPage(), errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(url,{waitUntil:'networkidle'});await p.locator('[data-action=start-real]').click();
  await p.setViewportSize({width:320,height:800});
  await p.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth,null,{timeout:3000});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'formulaire sans débordement à 320 px');
  assert.equal(await p.locator('#modal').evaluate(x=>x.scrollWidth<=x.clientWidth),true,'dialogue sans débordement à 320 px');
  await p.setViewportSize({width:390,height:844});
  assert.equal(await p.locator('#modal [name=model]').isDisabled(),true);
  await p.locator('#modal [data-action=use-clio-example]').click();
  assert.equal(await p.locator('#modal [name=brand]').inputValue(),'Renault');assert.equal(await p.locator('#modal [name=model]').inputValue(),'Clio');
  assert.equal(await p.locator('#modal [name=odometer]').inputValue(),'');assert.equal(await p.locator('#modal form').evaluate(f=>f.checkValidity()),false);
  await p.locator('#modal [data-action=free-brand]').click();
  await fill(p,'brand','ren');assert.ok((await options(p,'brand-suggestions')).includes('Renault'));
  await fill(p,'brand','Renault');assert.equal(await p.locator('#modal [name=model]').isEnabled(),true);
  assert.ok((await options(p,'model-suggestions')).includes('Clio'));assert.ok(!(await options(p,'model-suggestions')).includes('208'));
  await fill(p,'model','Clio');await fill(p,'year','2008');await fill(p,'version','1.5 dCi 68');
  assert.equal(await p.locator('#modal form').evaluate(f=>f.checkValidity()),false,'le kilométrage est obligatoire');
  await p.locator('#modal [data-action=free-brand]').click();assert.equal(await p.locator('#modal [name=brand]').inputValue(),'');assert.equal(await p.locator('#modal [name=model]').isDisabled(),true);
  await fill(p,'brand','Fabrique Libre');await fill(p,'model','Modèle Étoile');await p.selectOption('#modal [name=fuel]','autre');await fill(p,'fuelCustom','Bioéthanol');await fill(p,'odometer','123456');await submit(p);
  let all=await records(p), car=all.vehicles[0], saved=all.settings.find(x=>x.id==='vehicleSuggestions');
  assert.equal(car.brand,'Fabrique Libre');assert.equal(car.model,'Modèle Étoile');assert.equal(car.fuel,'autre');assert.equal(car.fuelDetail,'Bioéthanol');
  assert.ok(saved.brands.includes('Fabrique Libre'));assert.ok(saved.models.some(x=>x.brand==='Fabrique Libre'&&x.model==='Modèle Étoile'));
  await p.reload({waitUntil:'networkidle'});await add(p);
  assert.equal(await p.locator('#modal [name=brand]').inputValue(),'Fabrique Libre');assert.equal(await p.locator('#modal [name=model]').inputValue(),'Modèle Étoile');
  await fill(p,'brand','Peugeot');assert.equal(await p.locator('#modal [name=model]').inputValue(),'');
  assert.ok((await options(p,'model-suggestions')).includes('208'));assert.ok(!(await options(p,'model-suggestions')).includes('Clio'));
  await fill(p,'model','208');await p.selectOption('#modal [name=fuel]','hybride_rechargeable');await fill(p,'odometer','9000');await submit(p);
  all=await records(p);car=all.vehicles.find(v=>v.brand==='Peugeot');assert.equal(car.fuel,'hybride');assert.equal(car.fuelDetail,'Hybride rechargeable');
  await add(p);await fill(p,'brand','fabrique libre');assert.ok((await options(p,'model-suggestions')).includes('Modèle Étoile'));
  assert.equal(await p.locator('#modal [data-action=free-model]').innerText(),'Autre modèle…');
  await p.locator('#modal [data-action=close-modal]').first().click();
  await p.evaluate(async()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
  // WebKit Playwright échoue en interne avec setOffline ; couper plutôt l'accès serveur.
  if(process.env.VIGIE_BROWSER==='webkit')server.simulateDisconnect=true;else await ctx.setOffline(true);
  await p.reload({waitUntil:'load'});await add(p);await fill(p,'brand','Renault');
  assert.ok((await options(p,'model-suggestions')).includes('Clio'),'référentiel disponible sans serveur');
  await p.locator('#modal [data-action=close-modal]').first().click();
  if(process.env.VIGIE_BROWSER==='webkit')server.simulateDisconnect=false;else await ctx.setOffline(false);
  // Deux onglets écrivent des suggestions différentes : la transaction fusionne les ajouts.
  const q=await ctx.newPage();q.on('pageerror',e=>errors.push(e.message));q.on('dialog',d=>d.accept());await q.goto(url,{waitUntil:'networkidle'});
  await add(p);await add(q);
  await fill(p,'brand','Marque Alpha');await fill(p,'model','Premier');await fill(p,'odometer','1');
  await fill(q,'brand','Marque Beta');await fill(q,'model','Second');await fill(q,'odometer','2');
  await Promise.all([submit(p),submit(q)]);
  all=await records(p);saved=all.settings.find(x=>x.id==='vehicleSuggestions');
  assert.ok(saved.brands.includes('Marque Alpha'));assert.ok(saved.brands.includes('Marque Beta'));
  assert.ok(saved.models.some(x=>x.model==='Premier'));assert.ok(saved.models.some(x=>x.model==='Second'));
  const beforeBadImport=await records(p), incompatible=structuredClone(beforeBadImport);
  incompatible.settings.find(x=>x.id==='vehicleSuggestions').version=2;
  await p.locator('.mobile-nav [data-route=parametres]').click();
  await p.locator('#import-file').setInputFiles({name:'incompatible.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({app:'VigieAuto',formatVersion:3,exportedAt:new Date().toISOString(),data:incompatible}))});
  await p.waitForFunction(()=>document.querySelector('#toast')?.textContent.includes('Suggestions de véhicules incompatibles'));
  assert.deepEqual(await records(p),beforeBadImport,'un import incompatible ne doit rien écraser');
  await add(p);await fill(p,'brand','Autre marque…');await fill(p,'model','Autre modèle…');await fill(p,'odometer','3');await submit(p);
  assert.ok((await records(p)).vehicles.some(x=>x.brand==='Autre marque…'&&x.model==='Autre modèle…'),'aucun nom non vide n’est réservé');
  const activeKept=await p.evaluate(async()=>{
    const {LocalDatabase}=await import('./js/db.js'),db=await new LocalDatabase().open(),data=await db.readAll();
    const [first,second]=data.vehicles,current=data.settings.find(x=>x.id==='activeVehicle');
    await db.apply([{store:'settings',type:'put',value:{...current,extraFuture:{ok:true}}}]);
    await db.chooseVehicle(first.id);await db.deleteVehicleCascade(first.id,{wasActive:true,activeId:second.id});
    const after=await db.readAll();db.db.close();return after.settings.find(x=>x.id==='activeVehicle');
  });
  assert.deepEqual(activeKept.extraFuture,{ok:true});
  assert.deepEqual(errors,[]);
  await ctx.close();
  console.log('✓ Référentiel, saisie libre, marque/modèle liés, énergie et kilométrage obligatoire');
  console.log('✓ Suggestions personnelles persistées, exportables, disponibles hors ligne et fusionnées entre onglets');
 } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
