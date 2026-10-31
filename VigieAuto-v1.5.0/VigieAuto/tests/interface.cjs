/* Tests d'interface facultatifs : npm install puis npm run test:interface. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.webmanifest':'application/manifest+json', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg' };
async function serve() {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let filename = path.resolve(root, `.${pathname}`);
    if (filename !== root && !filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(filename) && fs.statSync(filename).isDirectory()) filename = path.join(filename, 'index.html');
    if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(filename)] || 'application/octet-stream', 'cache-control':'no-store' });
    fs.createReadStream(filename).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}
const routeLabels = {accueil:'Tableau de bord',garage:'Mes véhicules',entretien:'Entretien',pleins:'Pleins & conso',trajets:'Trajets',depenses:'Dépenses',rappels:'Rappels',controles:'Contrôles qualité',symptomes:'Symptômes',documents:'Documents',statistiques:'Statistiques',parametres:'Paramètres',plus:'Toutes les rubriques'};
const waitRoute = (p, route) => p.waitForFunction(label => document.title === `${label} — VigieAuto`, routeLabels[route]);
const waitTheme = (p, theme) => p.waitForFunction(value => document.documentElement.dataset.theme === value, theme);
const selectTheme = async (p, theme, actual = theme) => {
  await p.locator(`input[name=theme][value=${theme}]`).check();
  await waitTheme(p, actual);
};
const fill = (p, name, val) => p.locator(`#modal [name="${name}"]`).fill(String(val));
const submit = async p => { await p.locator('#modal button[type=submit]').click(); await p.locator('#modal').waitFor({state:'hidden'}); };
async function mobileExtra(p, route) {
  if (['parametres','trajets'].includes(route)) {
    await p.locator(`.mobile-nav [data-route="${route}"]`).click();
  } else if (route === 'controles') {
    await p.locator('.mobile-cq-shortcut').click();
  } else {
    await p.locator('.mobile-menu-button').click();
    const link = p.locator(`.quick-action[data-route="${route}"]`);
    await link.waitFor(); await link.click();
  }
  await waitRoute(p, route);
}
async function quick(p, action) {
  await p.locator('.mobile-floating-add').click();
  await p.locator(`#modal [data-action="${action}"]`).click();
}
async function backup(p) {
  const download = p.waitForEvent('download');
  await p.locator('[data-action=export]').click();
  return JSON.parse(fs.readFileSync(await (await download).path(), 'utf8'));
}
async function upload(p, obj, expected = 'importée') {
  await p.locator('#import-file').setInputFiles({ name:'cq-auto-test.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(obj)) });
  await p.waitForFunction(word => document.querySelector('#toast')?.textContent.includes(word), expected);
}

(async () => {
  const { server, base } = await serve();
  const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport:{width:390,height:844}, locale:'fr-FR', timezoneId:'Europe/Paris', colorScheme:'light', acceptDownloads:true });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.accept());
    await page.goto(base, {waitUntil:'networkidle'});
    await waitTheme(page, 'sauge');
    assert.match(await page.locator('body').innerText(), /mode découverte/i);
    assert.deepEqual(await page.locator('.mobile-nav button').allTextContents(), ['Accueil', 'Entretien', 'Pleins', 'Trajets', 'Réglages']);
    assert.equal(await page.locator('.mobile-floating-add').getAttribute('aria-label'), 'Ajouter rapidement');
    await mobileExtra(page, 'parametres');
    assert.equal(await page.locator('#app-version').innerText(), JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version);
    assert.equal(await page.locator('input[name=theme]').count(), 3);
    const saugeLogo = await page.locator('.mobile-brand .brand-mark path').first().evaluate(e => getComputedStyle(e).fill);
    assert.equal(await page.locator('input[value=auto]').isChecked(), true);

    // Chaque palette suit désormais le téléphone ; le choix mixte initial reste compatible.
    await selectTheme(page, 'cyan');
    const cyanLogo = await page.locator('.mobile-brand .brand-mark path').first().evaluate(e => getComputedStyle(e).fill);
    assert.notEqual(cyanLogo, saugeLogo, 'le logo doit suivre la couleur du thème');
    assert.equal(await page.locator('#current-theme').innerText(), 'Cyan clair');
    await page.emulateMedia({colorScheme:'dark'}); await waitTheme(page, 'cyan-dark');
    assert.equal(await page.locator('#current-theme').innerText(), 'Cyan sombre');
    await page.reload({waitUntil:'networkidle'}); await waitTheme(page, 'cyan-dark');
    assert.equal(await page.locator('input[value=cyan]').isChecked(), true);
    await page.emulateMedia({colorScheme:'light'}); await waitTheme(page, 'cyan');
    await selectTheme(page, 'sauge');
    assert.equal(await page.locator('#current-theme').innerText(), 'Sauge clair');
    await page.emulateMedia({colorScheme:'dark'}); await waitTheme(page, 'sauge-dark');
    assert.equal(await page.locator('#current-theme').innerText(), 'Sauge sombre');
    await page.reload({waitUntil:'networkidle'}); await waitTheme(page, 'sauge-dark');
    assert.equal(await page.locator('input[value=sauge]').isChecked(), true);
    await page.emulateMedia({colorScheme:'light'}); await waitTheme(page, 'sauge');
    await page.emulateMedia({colorScheme:'dark'}); await waitTheme(page, 'sauge-dark');
    await selectTheme(page, 'auto', 'cyan-dark');
    assert.equal(await page.locator('#current-theme').innerText(), 'Cyan sombre');
    await page.emulateMedia({colorScheme:'light'}); await waitTheme(page, 'sauge');
    assert.equal(await page.locator('#current-theme').innerText(), 'Sauge clair');
    await page.emulateMedia({colorScheme:'dark'}); await waitTheme(page, 'cyan-dark');
    await page.reload({waitUntil:'networkidle'}); await waitTheme(page, 'cyan-dark');
    assert.equal(await page.locator('input[value=auto]').isChecked(), true);
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(255, 255, 255)');
    console.log('✓ Sauge et Cyan : clair/sombre en direct ; mixte conservé ; persistance en découverte');

    // Les données d'essai demeurent volatiles, contrairement au thème.
    await quick(page, 'add-symptom'); await fill(page, 'title', 'Essai éphémère'); await submit(page);
    await mobileExtra(page, 'symptomes'); assert.match(await page.locator('body').innerText(), /Essai éphémère/);
    await page.reload({waitUntil:'networkidle'}); await waitTheme(page, 'cyan-dark');
    assert.doesNotMatch(await page.locator('body').innerText(), /Essai éphémère/);
    await page.locator('[data-action=start-real]').click();
    await fill(page, 'brand', 'Citroën'); await fill(page, 'model', 'C3'); await fill(page, 'odometer', '73500'); await submit(page);
    assert.doesNotMatch(await page.locator('body').innerText(), /Bienvenue en mode découverte/);
    await page.locator('.mobile-nav [data-route=accueil]').click(); await page.waitForSelector('.garage-hero');
    assert.match(await page.locator('.garage-hero').innerText(), /Citroën C3/);
    assert.match(await page.locator('.garage-alert').innerText(), /Aucun rappel enregistré/);
    await page.reload({waitUntil:'networkidle'}); await waitTheme(page, 'cyan-dark');
    assert.match(await page.locator('.garage-hero').innerText(), /Citroën C3/);
    console.log('✓ données fictives volatiles ; création réelle et thème conservés après rechargement');

    // Menu + et formulaires réels ; le mode sombre couvre aussi le dialogue et les champs.
    await quick(page, 'add-fill');
    assert.equal(await page.locator('#modal form').getAttribute('data-form'), 'fill');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#modal')).backgroundColor), 'rgb(20, 47, 54)');
    await fill(page, 'volume', '30'); await fill(page, 'unitPrice', '1.8'); await submit(page);
    await quick(page, 'add-service'); await fill(page, 'title', 'Vidange test'); await fill(page, 'parts', '42'); await fill(page, 'labor', '8');
    await fill(page, 'reminderKm', '80000'); await submit(page);
    await quick(page, 'add-symptom'); await fill(page, 'title', 'Bruit test'); await submit(page);
    await quick(page, 'add-expense'); await fill(page, 'title', 'Assurance test'); await fill(page, 'amount', '23'); await submit(page);
    await page.locator('.mobile-nav [data-route=accueil]').click(); await page.waitForSelector('.garage-hero');
    assert.match(await page.locator('.garage-alert').innerText(), /1 rappel actif/);
    await page.locator('.garage-control [data-action=run-check]').click();
    assert.equal(await page.locator('#modal form').getAttribute('data-form'), 'check');
    await page.locator('#modal [data-action=close-modal]').first().click();
    console.log('✓ menu +, quatre formulaires, contrôle rapide et indicateurs fondés sur les rappels');

    // Toutes les rubriques restent accessibles avec la navigation revue.
    for (const route of ['garage','depenses','rappels','symptomes','documents','statistiques','parametres']) {
      await mobileExtra(page, route);
      assert.ok(await page.locator('main h1').isVisible(), route);
    }
    for (const route of ['entretien','pleins','trajets','parametres','accueil']) {
      await page.locator(`.mobile-nav [data-route=${route}]`).click();
      await page.waitForFunction(r => document.querySelector(`.mobile-nav [data-route="${r}"]`)?.getAttribute('aria-current') === 'page', route);
    }
    await mobileExtra(page, 'controles'); assert.ok(await page.locator('main h1').isVisible());
    console.log('✓ navigation mobile : cinq onglets, CQ direct, accès aux autres rubriques et états actifs');

    await mobileExtra(page, 'parametres'); await selectTheme(page, 'cyan', 'cyan-dark');
    const saved = await backup(page);
    assert.equal(saved.data.settings.find(x => x.id === 'theme').value, 'cyan');
    assert.equal(saved.data.vehicles[0].model, 'C3');
    assert.equal(saved.data.services[0].title, 'Vidange test');
    assert.equal(saved.data.fills.length, 1); assert.equal(saved.data.symptoms.length, 1); assert.equal(saved.data.expenses.length, 1);
    await selectTheme(page, 'sauge', 'sauge-dark'); await upload(page, saved); await waitTheme(page, 'cyan-dark');
    assert.equal(await page.locator('input[value=cyan]').isChecked(), true);
    const invalid = structuredClone(saved); invalid.data.settings.find(x => x.id === 'theme').value = 'indefini';
    await upload(page, invalid, 'Thème invalide'); await waitTheme(page, 'cyan-dark');
    const old = structuredClone(saved); old.app = 'CQ Auto'; old.formatVersion = 1; delete old.data.trips; old.data.settings = old.data.settings.filter(x => x.id !== 'theme');
    await upload(page, old); await waitTheme(page, 'cyan-dark');
    assert.equal(await page.locator('input[value=auto]').isChecked(), true);
    await page.locator('.mobile-nav [data-route=entretien]').click(); await waitRoute(page, 'entretien');
    assert.match(await page.locator('body').innerText(), /Vidange test/);
    console.log('✓ sauvegarde et restauration du thème ; fichier ancien accepté ; fichier invalide refusé');

    // Responsive à plusieurs tailles : vérifier toutes les pages et certains formulaires en sombre.
    for (const width of [320, 375, 390, 650, 768, 1440]) {
      await page.setViewportSize({width, height:900});
      for (const route of ['accueil','garage','entretien','pleins','trajets','depenses','rappels','controles','symptomes','documents','statistiques','parametres','plus']) {
        await page.evaluate(r => { location.hash = r; }, route);
        await page.waitForFunction(r => document.title.includes(r === 'plus' ? 'Toutes les rubriques' : ({accueil:'Tableau de bord',garage:'Mes véhicules',entretien:'Entretien',pleins:'Pleins & conso',trajets:'Trajets',depenses:'Dépenses',rappels:'Rappels',controles:'Contrôles qualité',symptomes:'Symptômes',documents:'Documents',statistiques:'Statistiques',parametres:'Paramètres'})[r]), route);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `débordement ${width}px / ${route}`);
      }
    }
    await page.setViewportSize({width:390, height:844});
    await page.evaluate(() => { location.hash = 'accueil'; }); await page.waitForSelector('.garage-hero');
    await quick(page, 'add-service');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.ok(await page.locator('#modal input[name=title]').isVisible());
    await page.locator('#modal [data-action=close-modal]').first().click();
    console.log('✓ toutes les vues et un formulaire Cyan sombre sans débordement, de 320 à 1440 px');

    await mobileExtra(page, 'parametres'); await selectTheme(page, 'sauge', 'sauge-dark');
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({width, height:900});
      for (const route of Object.keys(routeLabels)) {
        await page.evaluate(r => { location.hash = r; }, route); await waitRoute(page, route);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Sauge sombre ${width}px / ${route}`);
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'sauge-dark');
      }
    }
    await page.setViewportSize({width:390, height:844});
    await page.evaluate(() => { location.hash = 'accueil'; }); await waitRoute(page, 'accueil');
    await quick(page, 'add-service');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#modal')).backgroundColor), 'rgb(25, 49, 40)');
    assert.ok(await page.locator('#modal input[name=title]').isVisible());
    await page.locator('#modal [data-action=close-modal]').first().click();
    console.log('✓ Sauge sombre sur toutes les pages, contrôles et formulaires');
    await mobileExtra(page, 'parametres'); await selectTheme(page, 'auto', 'cyan-dark');
    await page.locator('.mobile-nav [data-route=accueil]').click(); await waitRoute(page, 'accueil');

    await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    assert.ok(await page.evaluate(async () => !!(await caches.match('./css/themes.css'))));
    await context.setOffline(true); await page.reload({waitUntil:'load'}); await waitTheme(page, 'cyan-dark');
    assert.match(await page.locator('.garage-hero').innerText(), /Citroën C3/);
    await mobileExtra(page, 'parametres'); await selectTheme(page, 'sauge', 'sauge-dark');
    await page.reload({waitUntil:'load'}); await waitTheme(page, 'sauge-dark');
    assert.equal(await page.locator('input[value=sauge]').isChecked(), true);
    console.log('✓ application, thèmes et données utilisables hors ligne après mise en cache');

    // L'effacement complet réinitialise la préférence et les données réelles.
    await page.locator('[data-action=reset-all]').click(); await waitTheme(page, 'cyan-dark');
    assert.match(await page.locator('body').innerText(), /Votre carnet commence ici/);
    await page.reload({waitUntil:'load'}); await waitTheme(page, 'cyan-dark');
    assert.match(await page.locator('body').innerText(), /mode découverte/i);
    assert.doesNotMatch(await page.locator('body').innerText(), /Citroën C3/);
    assert.deepEqual(errors, []);
    console.log('✓ effacement complet et absence d’erreurs JavaScript');
    await context.close();
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
