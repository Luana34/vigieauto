import { LocalDatabase, STORES } from "./db.js";
import { VIGIE_LOGO_PATHS } from "./logo.js";
import { consumeGpsFix } from "./gps.js";
import {
  SUGGESTION_SETTING_ID, AUTRE_MARQUE, AUTRE_MODELE, FUEL_CHOICES,
  normalise, validateSuggestionSetting, rememberVehicle, brandSuggestions, modelSuggestions,
  fuelChoice, encodeFuel, fuelLabel,
} from "./catalogue.js";
import {
  addDays,
  today,
  dayDiff,
  number,
  money,
  shortDate,
  prettyDate,
  fillIntervals,
  averageEnergyCostPerKm,
  reminderInfo,
  spending,
  monthlySpending,
} from "./calc.js";
import {
  DEFAULT_TEMPLATES,
  demoRecords,
  SERVICE_CATEGORIES,
  EXPENSE_CATEGORIES,
  SYMPTOM_CATEGORIES,
  DOC_CATEGORIES,
} from "./data.js";

const APP_VERSION = "1.5.0";
const $ = (selector) => document.querySelector(selector);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const iconPaths = {
  logo: '<circle cx="12" cy="12" r="9"/><path d="M3.3 10.5h5L12 14l3.7-3.5h5M12 14v7"/><circle cx="12" cy="12" r="1.7"/>',
  home: '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21v-7h6v7"/>',
  car: '<path d="M4 16h16l-1.4-6.2a2 2 0 0 0-2-1.5H7.4a2 2 0 0 0-2 1.5z"/><path d="M4 16v3m16-3v3M6.5 19h1M16.5 19h1M6 12h12M7 15h.01M17 15h.01M7 8l1-3h8l1 3"/>',
  wrench:
    '<path d="M14.5 6.5a4.5 4.5 0 0 0-5.8 5.8l-5.2 5.2a2 2 0 0 0 2.8 2.8l5.2-5.2a4.5 4.5 0 0 0 5.8-5.8l-3 3-2.8-2.8z"/>',
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M3 21h13M7 6h5v4H7zM15 12h2v5a2 2 0 0 0 4 0V8l-3-3"/>',
  receipt:
    '<path d="M5 3h14v18l-2.3-1.4L14.3 21 12 19.6 9.7 21l-2.4-1.4L5 21z"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-2 7-2 9h16c0-2-2-2-2-9M10 20h4"/>',
  check:
    '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3.5h8M8 10l1.5 1.5L12 9m2 2h3M8 15l1.5 1.5L12 14m2 2h3"/>',
  symptom:
    '<path d="M3 12h4l2-5 4 10 2-5h6"/><path d="M12 21s-9-5.7-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 13h6M9 17h6"/>',
  chart: '<path d="M4 20h16M6 17v-5M12 17V5M18 17V9"/>',
  settings:
    '<path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="4.2"/>',
  shield:
    '<path d="M12 3 4.5 6v5c0 4.3 2.7 7.7 7.5 10 4.8-2.3 7.5-5.7 7.5-10V6z"/><path d="m9 12 2 2 4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
  speed:
    '<path d="M4 18a9 9 0 1 1 16 0M12 13l4-4M7 18h10"/><circle cx="12" cy="13" r="1"/>',
  route: '<path d="M8 3 3.5 21M16 3l4.5 18M12 3v3M12 10v4M12 18v3"/>',
  edit: '<path d="m4 17 10.7-10.7a2.1 2.1 0 0 1 3 3L7 20H4zM13 8l3 3"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/>',
  upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 17v3h16v-3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  warning: '<path d="M12 3 2.8 20h18.4zM12 9v4M12 17h.01"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  spark:
    '<path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z"/>',
  folder: '<path d="M3 6h7l2 2h9v11H3z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.5"/>',
  checkmark: '<path d="m5 12 4 4L19 6"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
};
function I(name) {
  if (name === "logo") return `<svg viewBox="190 145 875 1020" aria-hidden="true" focusable="false">${VIGIE_LOGO_PATHS}</svg>`;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.info}</svg>`;
}
function square(name, color = "") {
  return `<span class="square-icon ${color}">${I(name)}</span>`;
}
function uid() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}
const state = {
  db: null,
  records: null,
  demo: false,
  activeId: null,
  route: "accueil",
  installPrompt: null,
  serviceFilter: "all",
  tripFilter: "all",
  startingTrip: false,
  fuelFilter: "all",
  themePreference: "auto",
  catalogue: { version: 1, brands: [], fuels: Object.values(FUEL_CHOICES) },
};
// Les coordonnées reçues restent uniquement dans fixState, en mémoire de cet onglet.
const gps = {
  tripId: null, watchId: null, token: 0, fixState: null,
  phase: "idle", message: "", permissionConfirmed: false,
  autoResume: false, transition: false, queue: Promise.resolve(),
  releaseLock: null, lockDone: null, finishTripId: null,
  pauseTask: null,
};
const app = $("#app");
const modal = $("#modal");
const VALID_THEMES = new Set(["sauge", "cyan", "auto"]);
const darkScheme = window.matchMedia?.("(prefers-color-scheme: dark)") || null;
function storedTheme(records) {
  const value = records.settings.find((x) => x.id === "theme")?.value;
  return VALID_THEMES.has(value) ? value : "auto";
}
const THEME_LABELS = {
  "sauge": "Sauge clair",
  "sauge-dark": "Sauge sombre",
  "cyan": "Cyan clair",
  "cyan-dark": "Cyan sombre",
};
function applyTheme() {
  const isDark = !!darkScheme?.matches;
  // Sauge et Cyan gardent leur palette et suivent chacun le mode du téléphone.
  // L'ancien choix automatique (mixte) reste compatible avec les sauvegardes existantes.
  const palette = state.themePreference === "auto"
    ? (isDark ? "cyan" : "sauge") : state.themePreference;
  const actual = isDark ? `${palette}-dark` : palette;
  document.documentElement.dataset.theme = actual;
  document.documentElement.dataset.themePreference = state.themePreference;
  const colors = { "sauge": "#286f4f", "sauge-dark": "#183126", "cyan": "#007b8b", "cyan-dark": "#122d35" };
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors[actual]);
  const current = $("#current-theme");
  if (current) current.textContent = THEME_LABELS[actual];
}
async function setThemePreference(value) {
  if (!VALID_THEMES.has(value)) return;
  const setting = { id: "theme", value };
  // Le thème est une préférence de l'appareil : il reste enregistré aussi en mode découverte.
  await state.db.apply([put("settings", setting)]);
  const index = state.records.settings.findIndex((x) => x.id === "theme");
  if (index >= 0) state.records.settings[index] = setting;
  else state.records.settings.push(setting);
  state.themePreference = value;
  applyTheme();
  toast("Thème enregistré sur cet appareil.");
}
let toastTimer;
function toast(message, error = false) {
  const el = $("#toast");
  el.textContent = message;
  el.className = `visible${error ? " error" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.className = "";
  }, 4200);
}
function demoToast(
  message = "Exemple modifié : rien n’est sauvegardé en mode découverte.",
) {
  toast(state.demo ? message : "Enregistré sur cet appareil.");
}
const getVehicle = () =>
  state.records?.vehicles.find((v) => v.id === state.activeId) || null;
const scoped = (store) =>
  state.records[store].filter((x) => x.vehicleId === state.activeId);
const recordById = (store, id) => state.records[store].find((x) => x.id === id);
function sortRecent(rows) {
  return [...rows].sort(
    (a, b) =>
      (b.date || "").localeCompare(a.date || "") ||
      (b.createdAt || "").localeCompare(a.createdAt || ""),
  );
}
function nameOf(v) {
  return v
    ? `${v.brand || ""} ${v.model || ""}`.trim() || "Véhicule"
    : "Aucun véhicule";
}
function validPhoto(data) {
  return (
    typeof data === "string" &&
    /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/i.test(data)
  );
}
function validDocument(data) {
  return (
    typeof data === "string" &&
    /^data:(?:image\/(?:jpeg|png|webp|gif)|application\/pdf);base64,[A-Za-z0-9+/=\r\n]+$/i.test(
      data,
    )
  );
}
function vehicleImage(v) {
  return validPhoto(v?.photo) ? v.photo : "./assets/garage.jpg";
}
function dateNowLabel() {
  return prettyDate(today(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
function scopedFinance() {
  return {
    fills: scoped("fills"),
    services: scoped("services"),
    expenses: scoped("expenses"),
  };
}
function carUnit() {
  return getVehicle()?.fuel === "electrique" ? "kWh" : "L";
}
function activeReminders() {
  const v = getVehicle();
  return scoped("reminders")
    .filter((x) => x.active !== false)
    .map((x) => ({ ...x, info: reminderInfo(x, v) }))
    .sort((a, b) => {
      const rank = { overdue: 0, soon: 1, ok: 2 };
      return (
        rank[a.info.status] - rank[b.info.status] ||
        (a.dueDate || "9999").localeCompare(b.dueDate || "9999") ||
        (a.dueKm ?? Infinity) - (b.dueKm ?? Infinity)
      );
    });
}
async function apply(operations) {
  if (!state.demo) await state.db.apply(operations);
  applyToMemory(operations);
}
function applyToMemory(operations) {
  for (const op of operations) {
    const rows = state.records[op.store];
    if (op.type === "clear") {
      state.records[op.store] = [];
      continue;
    }
    const index = rows.findIndex(
      (x) => x.id === (op.type === "put" ? op.value.id : op.id),
    );
    if (op.type === "delete") {
      if (index >= 0) rows.splice(index, 1);
    } else if (op.type === "put") {
      if (index >= 0) rows[index] = op.value;
      else rows.push(op.value);
    }
  }
}
function put(store, value) {
  return { store, type: "put", value };
}
function del(store, id) {
  return { store, type: "delete", id };
}
function odometerOperation(vehicleId, km) {
  const v = recordById("vehicles", vehicleId);
  return v &&
    Number.isFinite(Number(km)) &&
    Number(km) > Number(v.odometer || 0)
    ? put("vehicles", {
        ...v,
        odometer: Number(km),
        updatedAt: new Date().toISOString(),
      })
    : null;
}
async function chooseVehicle(id) {
  if (!recordById("vehicles", id)) return;
  if (state.demo) {
    const active = { ...(state.records.settings.find((x) => x.id === "activeVehicle") || {}), id: "activeVehicle", value: id };
    await apply([put("settings", active)]);
  } else {
    const active = await state.db.chooseVehicle(id);
    applyToMemory([put("settings", active)]);
  }
  state.activeId = id;
  render();
}
async function leaveDemo() {
  if (!state.demo) return;
  state.demo = false;
  state.records = await state.db.readAll();
  state.activeId = state.records.vehicles[0]?.id || null;
  render();
}
function go(route) {
  if (location.hash.slice(1) === route) {
    state.route = route;
    render();
  } else location.hash = route;
}
const NAV_GROUPS = [
  [
    "VOTRE ESPACE",
    [
      ["accueil", "home", "Tableau de bord"],
      ["garage", "car", "Mes véhicules"],
    ],
  ],
  [
    "MON SUIVI",
    [
      ["entretien", "wrench", "Entretien"],
      ["pleins", "fuel", "Pleins & conso"],
      ["trajets", "route", "Trajets"],
      ["depenses", "receipt", "Dépenses"],
      ["rappels", "bell", "Rappels"],
    ],
  ],
  [
    "PRENDRE SOIN",
    [
      ["controles", "check", "Contrôles qualité"],
      ["symptomes", "symptom", "Symptômes"],
      ["documents", "file", "Documents"],
    ],
  ],
  [
    "EN UN COUP D’ŒIL",
    [
      ["statistiques", "chart", "Statistiques"],
      ["parametres", "settings", "Paramètres"],
    ],
  ],
];
const PAGE_LABELS = Object.fromEntries(
  NAV_GROUPS.flatMap(([, items]) =>
    items.map(([route, , label]) => [route, label]),
  ),
);
PAGE_LABELS.plus = "Toutes les rubriques";
function navigation() {
  return NAV_GROUPS.map(
    ([title, items]) =>
      `<div class="nav-group">${title}</div>${items.map(([route, icon, label]) => `<button type="button" class="nav-item ${state.route === route ? "active" : ""}" data-route="${route}" aria-label="${esc(label)}" ${state.route === route ? 'aria-current="page"' : ""}>${I(icon)}<span>${label}</span></button>`).join("")}`,
  ).join("");
}
function mobileNav() {
  const item = (route, icon, label) => `<button type="button" data-route="${route}" class="${state.route === route ? "active" : ""}" ${state.route === route ? 'aria-current="page"' : ""}>${I(icon)}<span>${label}</span></button>`;
  return `${item("accueil", "home", "Accueil")}${item("entretien", "wrench", "Entretien")}${item("pleins", "fuel", "Pleins")}${item("trajets", "route", "Trajets")}${item("parametres", "settings", "Réglages")}`;
}
function demoBanner() {
  return state.demo
    ? `<div class="demo-banner"><span class="demo-icon">${I("spark")}</span><span class="demo-copy"><b>Bienvenue en mode découverte</b><br>Ce véhicule est un exemple : les modifications de ses données ne sont pas enregistrées.</span><button class="btn small" data-action="start-real">Commencer avec mon véhicule ${I("arrow")}</button></div>`
    : "";
}
function pageHeading(title, subtitle, button = "") {
  return `<div class="page-heading"><div><p class="eyebrow">MON CARNET DE BORD</p><h1>${title}</h1><p class="subheading">${subtitle}</p></div>${button}</div>`;
}
function addButton(label, action) {
  return `<button class="btn" data-action="${action}">${I("plus")} ${label}</button>`;
}
function metric(label, value, unit, caption, icon) {
  return `<div class="card metric-card"><div class="metric-top"><span>${label}</span>${I(icon)}</div><div class="metric-value">${value} ${unit ? `<small>${unit}</small>` : ""}</div><div class="metric-caption">${caption}</div></div>`;
}
function empty(icon, title, text, action = "", button = "") {
  return `<div class="empty">${square(icon)}<h3>${title}</h3><p>${text}</p>${action ? `<button class="btn small" data-action="${action}">${I("plus")} ${button}</button>` : ""}</div>`;
}
function requireVehicleView(title, subtitle) {
  return `${pageHeading(title, subtitle)}<div class="card">${empty("car", "Ajoutez d’abord un véhicule", "Votre carnet sera prêt en quelques instants.", "add-vehicle", "Ajouter un véhicule")}</div>`;
}
function shell(content) {
  const label = PAGE_LABELS[state.route] || "Tableau de bord";
  return `<div class="app-shell">
    <aside class="sidebar" aria-label="Navigation principale">
      <a class="brand" href="#accueil" aria-label="VigieAuto, accueil"><span class="brand-mark">${I("logo")}</span><span><span class="brand-name">VigieAuto</span><span class="brand-sub">VOTRE CARNET DE ROUTE</span></span></a>
      <nav class="nav-scroll">${navigation()}</nav><div class="sidebar-bottom"><div class="privacy-mini">${I("shield")}<span><b>Vos données, chez vous.</b><br>Stockées sur cet appareil.</span></div></div>
    </aside>
    <div class="main-area"><header class="topbar"><div class="topbar-left"><div class="mobile-brand"><span class="brand-mark">${I("logo")}</span><span class="brand-name">VigieAuto</span></div><div class="topbar-label">Mon espace <span style="padding:0 8px;color:#c2ccc4">/</span> <strong>${esc(label)}</strong></div></div>
      <div class="topbar-right"><span class="local-status"><span class="status-dot"></span> Stockage local</span><button type="button" class="icon-button mobile-cq-shortcut" data-route="controles" aria-label="Contrôles qualité">CQ</button><button class="icon-button" data-route="rappels" aria-label="Voir les rappels">${I("bell")}</button><button class="icon-button desktop-top-icon" data-route="parametres" aria-label="Paramètres">${I("settings")}</button><button class="icon-button mobile-menu-button" data-route="plus" aria-label="Toutes les rubriques">${I("more")}</button><button class="btn small desktop-quick-add" data-action="quick-menu">${I("plus")} Ajouter</button></div></header>
      <main id="main-content" class="workspace" tabindex="-1">${demoBanner()}${content}</main></div>
    <nav class="mobile-nav" aria-label="Navigation mobile">${mobileNav()}</nav>
    <button type="button" class="mobile-floating-add" data-action="quick-menu" aria-label="Ajouter rapidement">${I("plus")}</button>
  </div>`;
}
function vehicleHero(v) {
  return `<div class="card vehicle-card"><img class="vehicle-image" src="${esc(vehicleImage(v))}" alt="${validPhoto(v.photo) ? "Photo de votre véhicule" : "Illustration d’un véhicule"}"><div class="vehicle-overlay"></div>
    <div class="vehicle-main"><div class="vehicle-label">${I("car")}<p class="eyebrow">MON VÉHICULE ${state.demo ? "· EXEMPLE" : ""}</p></div><div class="vehicle-name">${esc(nameOf(v))}</div><div class="vehicle-version">${esc(v.version || fuelLabel(v) || "Votre compagnon de route")}</div>${v.plate ? `<div class="plate">${esc(v.plate)}</div>` : ""}</div>
    <div class="vehicle-footer"><div><span class="label">Kilométrage</span><span class="value">${number(v.odometer)} <small>km</small></span></div><div><span class="label">Énergie</span><span class="value">${esc(fuelLabel(v))}</span></div><div><span class="label">Année</span><span class="value">${esc(v.year || "—")}</span></div><button class="btn secondary small change-vehicle" data-route="garage">Mon garage ${I("arrow")}</button></div></div>`;
}
function remindersCard() {
  const reminders = activeReminders();
  return `<div class="card reminder-card"><div class="card-head"><div><h2>À garder à l’œil</h2><p class="card-kicker">Vos prochains rappels</p></div><span class="round-count">${reminders.length}</span></div>
   <div class="reminder-list">${
     reminders
       .slice(0, 2)
       .map(
         (r) =>
           `<div class="reminder-mini">${square(r.category === "administratif" ? "calendar" : "wrench", r.info.overdue ? "red" : "orange")}<div class="reminder-mini-content"><div class="reminder-mini-title">${esc(r.title)}</div><div class="reminder-mini-meta">${esc(r.info.label)}</div></div><span class="mini-pill ${r.info.status}">${r.info.overdue ? "En retard" : r.info.soon ? "À prévoir" : "À venir"}</span></div>`,
       )
       .join("") ||
     '<p class="card-intro">Tout est à jour. Créez un rappel pour ne rien oublier.</p>'
   }</div>
   <button class="card-link" data-route="rappels">Voir tous les rappels ${I("arrow")}</button></div>`;
}
function quickAction(icon, color, title, caption, action) {
  return `<button class="quick-action" data-action="${action}">${square(icon, color)}<span><span class="action-label">${title}</span><small>${caption}</small></span><span class="arrow">${I("arrow")}</span></button>`;
}
function recentActivity() {
  const events = [
    ...scoped("services").map((x) => ({
      ...x,
      kind: "service",
      icon: "wrench",
      color: "",
      label: x.title,
      amount: (Number(x.parts) || 0) + (Number(x.labor) || 0),
    })),
    ...scoped("fills").map((x) => ({
      ...x,
      kind: "fill",
      icon: "fuel",
      color: "orange",
      label: x.unit === "kWh" ? "Recharge" : "Plein de carburant",
      amount: Number(x.total) || 0,
    })),
    ...scoped("expenses").map((x) => ({
      ...x,
      kind: "expense",
      icon: "receipt",
      color: "blue",
      label: x.title,
      amount: Number(x.amount) || 0,
    })),
    ...scoped("checks").map((x) => ({
      ...x,
      kind: "check",
      icon: "check",
      color: "purple",
      label: x.templateName,
      amount: null,
    })),
  ];
  return sortRecent(events).slice(0, 4);
}
function activityCard() {
  const activities = recentActivity();
  return `<div class="card activity-card"><div class="card-head"><div><h2>Activité récente</h2><p class="card-kicker">Votre carnet au fil des jours</p></div><button class="section-link" data-route="entretien">Voir le carnet →</button></div><div class="activity-list">${activities.map((x) => `<div class="activity-row">${square(x.icon, x.color)}<div class="activity-body"><div class="activity-title">${esc(x.label)}</div><div class="activity-meta">${shortDate(x.date)}${x.odometer !== undefined && x.odometer !== null ? ` · ${number(x.odometer)} km` : ""}</div></div>${x.amount !== null ? `<div class="activity-amount">${money(x.amount)}</div>` : ""}</div>`).join("") || '<p class="card-intro">Votre activité apparaîtra ici après votre premier enregistrement.</p>'}</div></div>`;
}
function spendingCard() {
  const x = spending(scopedFinance());
  const p1 = x.total ? (x.fuel / x.total) * 100 : 0,
    p2 = x.total ? ((x.fuel + x.service) / x.total) * 100 : 0;
  const bg = x.total ? "" : "background:var(--donut-empty);";
  return `<div class="card spending-card"><div class="card-head"><div><h2>Vos dépenses</h2><p class="card-kicker">Total des montants enregistrés</p></div><button class="section-link" data-route="statistiques">Détails →</button></div><div class="donut-wrap"><div class="donut" style="--a:${p1}%;--b:${p2}%;${bg}"><div class="donut-inner"><strong>${money(x.total)}</strong><span>au total</span></div></div><div class="legend"><div class="legend-row"><i></i><span>Carburant</span><b>${money(x.fuel)}</b></div><div class="legend-row"><i></i><span>Entretien</span><b>${money(x.service)}</b></div><div class="legend-row"><i></i><span>Autres</span><b>${money(x.other)}</b></div></div></div></div>`;
}
function outlineCar() {
  return `<svg class="garage-car-line" viewBox="0 0 270 88" fill="none" aria-hidden="true"><path d="M21 60c5-8 15-11 31-14l27-19c9-6 17-9 30-9h46c15 0 28 5 40 16l12 11 28 5c8 2 13 6 15 14l2 5H20z" stroke="currentColor" stroke-width="2"/><path d="M82 45l12-12c5-5 10-7 19-7h38c11 0 20 4 30 13l6 6H82z" stroke="currentColor" stroke-width="1.5"/><circle cx="70" cy="68" r="13" fill="var(--vehicle-wheel)" stroke="currentColor" stroke-width="2"/><circle cx="70" cy="68" r="6" stroke="currentColor"/><circle cx="206" cy="68" r="13" fill="var(--vehicle-wheel)" stroke="currentColor" stroke-width="2"/><circle cx="206" cy="68" r="6" stroke="currentColor"/><path d="M115 26v18M198 52h18M34 53h17" stroke="currentColor" stroke-width="1.4"/></svg>`;
}
function garageVehicle(v) {
  const art = validPhoto(v.photo)
    ? `<img class="garage-photo" src="${esc(v.photo)}" alt="Photo de ${esc(nameOf(v))}">`
    : outlineCar();
  return `<section class="garage-hero" aria-label="Véhicule actif"><div class="garage-hero-top"><span>VÉHICULE ACTIF${state.demo ? " · EXEMPLE" : ""}</span>${v.plate ? `<span class="garage-plate">${esc(v.plate)}</span>` : ""}</div><div class="garage-hero-name">${esc(nameOf(v))}</div><div class="garage-hero-version">${esc(v.version || "")} ${v.version && v.fuel ? " / " : ""} ${esc(fuelLabel(v))} ${v.year ? ` / ${esc(v.year)}` : ""}</div>${art}<div class="garage-hero-foot"><div><span>COMPTEUR</span><strong>${number(v.odometer)} <small>km</small></strong></div><button class="garage-change" data-route="garage">Mon garage ${I("arrow")}</button></div></section>`;
}
function garageAlert(reminders) {
  const late = reminders.filter((r) => r.info.overdue).length;
  const soon = reminders.filter((r) => r.info.soon && !r.info.overdue).length;
  const active = reminders.length;
  const label = late ? `${late} rappel${late > 1 ? "s" : ""} en retard`
    : soon ? `${soon} rappel${soon > 1 ? "s" : ""} à prévoir`
    : active ? `${active} rappel${active > 1 ? "s" : ""} actif${active > 1 ? "s" : ""}` : "Aucun rappel enregistré";
  const detail = reminders.slice(0, 2).map((r) => r.title).join(" · ") || "Ajoutez une échéance pour ne rien oublier.";
  return `<button class="garage-alert ${late ? "is-late" : soon ? "is-due" : "is-clear"}" ${active ? 'data-route="rappels"' : 'data-action="add-reminder"'}>${I(late || soon ? "warning" : "bell")}<span><b>${esc(label)}</b><small>${esc(detail)}</small></span>${I("arrow")}</button>`;
}
function garageControl() {
  const t = recordById("templates", "cq-quick") || state.records.templates[0];
  return `<div class="garage-section-heading"><span>CONTRÔLE SUGGÉRÉ</span><button data-route="controles">Toutes les listes ${I("arrow")}</button></div><section class="garage-control card"><div class="garage-control-row"><span class="garage-control-icon">${I("check")}</span><div><h2>${esc(t?.name || "Votre premier contrôle")}</h2><p>${t ? `${number(t.items?.length || 0)} points · À réaliser quand vous le souhaitez` : "Créez une liste adaptée à votre véhicule."}</p></div>${I("check")}</div><button class="btn garage-control-button" ${t ? `data-action="run-check" data-id="${esc(t.id)}"` : 'data-route="controles"'}>${t ? "Lancer le contrôle" : "Voir les contrôles"} ${I("arrow")}</button></section>`;
}
function garageSnapshot(reminders, consumption) {
  const cells = reminders.slice(0, 2).map((r) => `<button class="garage-snapshot-item" data-route="rappels"><span>${esc(r.title)}</span><strong>${esc(r.info.label)}</strong></button>`);
  if (!cells.length) cells.push(`<button class="garage-snapshot-item" data-action="add-reminder"><span>RAPPELS</span><strong>Ajouter une échéance</strong></button>`);
  if (cells.length === 1) cells.push(`<button class="garage-snapshot-item" data-route="entretien"><span>ENTRETIENS</span><strong>${number(scoped("services").length)} enregistrés</strong></button>`);
  cells.push(`<button class="garage-snapshot-item" data-route="pleins"><span>CONSO MOYENNE</span><strong>${consumption.average === null ? "—" : number(consumption.average, 1)} <small>${esc(carUnit())}/100 km</small></strong></button>`);
  return `<div class="garage-snapshot">${cells.join("")}</div>`;
}
function dashboard() {
  const v = getVehicle();
  if (!v) return `${pageHeading("Votre garage", "Le suivi de votre véhicule, en toute simplicité.")}<div class="card garage-empty">${square("car")}<div><h2>Votre carnet commence ici.</h2><p>Ajoutez un véhicule pour suivre ses entretiens, ses pleins et vos contrôles.</p>${addButton("Ajouter mon véhicule", "add-vehicle")}</div></div>`;
  const finance = scopedFinance();
  const month = monthlySpending(finance, 1)[0];
  const consumption = fillIntervals(finance.fills, carUnit());
  const reminders = activeReminders();
  return `<div class="page-heading garage-page-heading"><div><p class="eyebrow">VOTRE CARNET DE BORD</p><h1>Votre garage<span class="garage-title-dot">.</span></h1><p class="subheading">Un coup d’œil, et vous savez où vous en êtes.</p></div><div class="date-chip">${I("calendar")} ${esc(dateNowLabel())}</div></div>
  <div class="garage-dashboard"><div class="garage-primary">${garageVehicle(v)}${garageAlert(reminders)}${tripQuickCard()}${garageControl()}${garageSnapshot(reminders, consumption)}<button class="garage-month" data-route="statistiques"><span>DÉPENSES CE MOIS</span><strong>${money(month.total)}</strong><span>DÉTAILS ${I("arrow")}</span></button></div>
  <div class="garage-secondary">${remindersCard()}${activityCard()}</div></div>
  <div class="garage-insights">${spendingCard()}<div class="card garage-tips"><div class="card-head"><div><h2>Votre carnet, à portée de main</h2><p class="card-kicker">Enregistrez ce qui compte, simplement.</p></div>${I("shield")}</div><div class="garage-shortcuts">${quickAction("fuel", "orange", v.fuel === "electrique" ? "Ajouter une recharge" : "Ajouter un plein", "Énergie & consommation", "add-fill")}${quickAction("wrench", "", "Ajouter un entretien", "Carnet d’entretien", "add-service")}${quickAction("symptom", "blue", "Signaler un symptôme", "Journal du véhicule", "add-symptom")}</div></div></div>
  <div class="note-line">${I("shield")} Vos informations restent sur cet appareil. Pensez à les sauvegarder régulièrement.</div>`;
}
const TRIP_PROFILES = Object.freeze({
  inconnu: "Non renseigné",
  hache: "Trafic haché",
  roulant: "Roulant",
  croisiere: "Croisière",
});
function runningTrips() {
  return state.records.trips.filter((x) => x.status === "running");
}
function startedLabel(value) {
  const d = new Date(value);
  return Number.isFinite(d.getTime())
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d)
    : "date inconnue";
}
// Le verrou empêche deux onglets compatibles de mesurer simultanément le même trajet.
// Sans Web Locks, les écritures restent conditionnelles ; une seule fenêtre est recommandée.
async function acquireGpsLock() {
  if (gps.releaseLock || !navigator.locks?.request) return true;
  let reply;
  const acquired = new Promise((resolve) => { reply = resolve; });
  let done;
  try {
    done = navigator.locks.request("vigieauto-gps-trajet", { ifAvailable: true }, (lock) => {
      if (!lock) { reply(false); return; }
      return new Promise((release) => { gps.releaseLock = release; reply(true); });
    }).catch((error) => { console.warn("Verrou GPS indisponible :", error); reply(false); });
  } catch (error) {
    console.warn("Verrou GPS indisponible :", error);
    return false;
  }
  gps.lockDone = done;
  const ok = await acquired;
  if (!ok) { await done; if (gps.lockDone === done) gps.lockDone = null; }
  return ok;
}
async function releaseGpsLock() {
  const release = gps.releaseLock, done = gps.lockDone;
  gps.releaseLock = null;
  gps.lockDone = null;
  if (release) release();
  if (done) await done;
}
function stopGpsWatch() {
  gps.token++;
  if (gps.watchId !== null) navigator.geolocation?.clearWatch(gps.watchId);
  gps.watchId = null;
  gps.fixState = null;
}
function gpsStatusText(x) {
  if (gps.tripId === x.id && gps.message) return gps.message;
  return "GPS arrêté. Pour poursuivre la mesure, appuyez sur Reprendre à l’arrêt.";
}
function syncGpsView() {
  for (const box of document.querySelectorAll("[data-gps-trip]")) {
    const trip = recordById("trips", box.dataset.gpsTrip);
    if (!trip || trip.method !== "gps") continue;
    const distance = box.querySelector("[data-gps-distance]");
    const status = box.querySelector("[data-gps-status]");
    const warning = box.querySelector("[data-gps-interrupted]");
    if (distance) distance.textContent = `${number(trip.gpsDistanceM / 1000, 2)} km estimés`;
    if (status) status.textContent = gpsStatusText(trip);
    if (warning) warning.hidden = !trip.gpsInterrupted;
  }
}
function queueGpsUpdate(id, change) {
  gps.queue = gps.queue.then(async () => {
    const updated = await state.db.updateGpsTrip(id, change);
    const index = state.records.trips.findIndex((x) => x.id === id);
    if (updated) {
      if (index >= 0 && state.records.trips[index].status === "running") state.records.trips[index] = updated;
      syncGpsView();
      return;
    }
    // Un autre onglet a terminé ou supprimé le trajet : ne jamais le recréer.
    const fresh = await state.db.getTrip(id);
    if (index >= 0) {
      if (fresh) state.records.trips[index] = fresh;
      else state.records.trips.splice(index, 1);
    }
    if (gps.tripId === id) {
      stopGpsWatch();
      gps.autoResume = false;
      gps.phase = "stopped";
      gps.message = "Le trajet a été terminé ou supprimé dans une autre fenêtre.";
      await releaseGpsLock();
      render();
    }
  }).catch(async (error) => {
    console.error("Enregistrement GPS :", error);
    stopGpsWatch();
    gps.autoResume = false;
    gps.phase = "error";
    gps.message = "Enregistrement GPS impossible. Terminez le trajet avec une distance saisie manuellement.";
    await releaseGpsLock();
    syncGpsView();
    if (document.visibilityState === "visible") toast(describeError(error), true);
  });
  return gps.queue;
}
function receiveGpsPosition(id, token, position) {
  if (gps.token !== token || gps.tripId !== id) return;
  if (document.visibilityState !== "visible") return;
  gps.permissionConfirmed = true;
  const result = consumeGpsFix(gps.fixState, position);
  gps.fixState = result.state;
  if (["inaccurate", "stale", "invalid"].includes(result.reason)) {
    gps.phase = "weak";
    gps.message = "Position imprécise ou ancienne : attente d’un signal fiable.";
    if (result.reason === "inaccurate" && gps.fixState?.anchor) {
      gps.fixState = null; // ne pas relier directement deux secteurs séparés par un signal imprécis
      queueGpsUpdate(id, { interrupted: true });
    }
  } else {
    gps.phase = "tracking";
    gps.message = result.interrupted
      ? "Reprise après une coupure ou un saut GPS : vérifiez la distance."
      : "Mesure en cours lorsque l’application est visible.";
    if (result.reason === "first" || result.addedM > 0 || result.interrupted)
      queueGpsUpdate(id, { hasFix: true, addedM: result.addedM, interrupted: result.interrupted });
  }
  syncGpsView();
}
function receiveGpsError(id, token, error) {
  if (gps.token !== token || gps.tripId !== id) return;
  if (error?.code === 1) {
    void pauseGps(id, { interrupted: true, message: "Accès à la localisation refusé. Autorisez-le dans les réglages du site ou saisissez la distance manuellement." })
      .catch((failure) => { console.error(failure); if (document.visibilityState === "visible") toast(describeError(failure), true); });
    return;
  }
  // Un signal temporairement perdu ne doit pas relier deux points éloignés.
  gps.fixState = null;
  gps.phase = "weak";
  gps.message = "Signal GPS indisponible : recherche en cours. La distance peut être incomplète.";
  queueGpsUpdate(id, { interrupted: true });
  syncGpsView();
}
async function beginGps(id, { freshStart = false } = {}) {
  if (gps.transition || gps.finishTripId) throw new Error("Patientez pendant la mise à jour du trajet.");
  if (gps.watchId !== null) {
    if (gps.tripId === id) return true;
    throw new Error("Un autre suivi GPS est déjà actif dans cette fenêtre.");
  }
  if (!window.isSecureContext || !navigator.geolocation?.watchPosition)
    throw new Error("GPS indisponible : utilisez une adresse HTTPS et un navigateur compatible, ou le mode manuel.");
  if (document.visibilityState !== "visible") throw new Error("Ouvrez VigieAuto à l’écran avant de reprendre le GPS.");
  gps.transition = true;
  gps.tripId = id;
  gps.phase = "searching";
  gps.message = "Recherche de la position… Autorisez la localisation si demandé.";
  gps.autoResume = false;
  render();
  try {
    if (!await acquireGpsLock()) {
      gps.phase = "paused";
      gps.message = "Le GPS est déjà utilisé dans une autre fenêtre VigieAuto. Revenez à cette fenêtre ou fermez-la.";
      return false;
    }
    const fresh = await state.db.getTrip(id);
    if (!fresh || fresh.status !== "running" || fresh.method !== "gps") {
      await releaseGpsLock();
      throw new Error("Ce trajet n’est plus en cours. Rechargez VigieAuto.");
    }
    const index = state.records.trips.findIndex((x) => x.id === id);
    if (index >= 0) state.records.trips[index] = fresh;
    if (!freshStart && !fresh.gpsInterrupted) {
      await queueGpsUpdate(id, { interrupted: true });
      if (gps.phase === "error" || gps.phase === "stopped") return false;
    }
    if (document.visibilityState !== "visible") {
      await releaseGpsLock();
      gps.phase = "paused";
      gps.message = "GPS en pause : revenez dans l’application pour le reprendre à l’arrêt.";
      await queueGpsUpdate(id, { interrupted: true });
      return false;
    }
    gps.fixState = null;
    const token = ++gps.token;
    try {
      gps.watchId = navigator.geolocation.watchPosition(
        (pos) => receiveGpsPosition(id, token, pos),
        (error) => receiveGpsError(id, token, error),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
      );
    } catch (error) {
      stopGpsWatch();
      await releaseGpsLock();
      gps.phase = "error";
      gps.message = "GPS indisponible : vérifiez la localisation et les autorisations du navigateur.";
      await queueGpsUpdate(id, { interrupted: true });
      return false;
    }
    return true;
  } finally {
    if (gps.watchId === null) await releaseGpsLock();
    gps.transition = false;
    render();
    // Le document peut être masqué pendant l'attente du verrou ou du navigateur.
    if (gps.watchId !== null && document.visibilityState !== "visible") {
      gps.pauseTask = pauseGps(id, {
        interrupted: true, autoResume: gps.permissionConfirmed,
        message: "Application masquée : GPS en pause, distance potentiellement incomplète.",
      }).catch((error) => { console.error(error); gps.autoResume = false; });
      await gps.pauseTask;
    }
  }
}
async function pauseGps(id, { interrupted = true, message = "GPS en pause. Reprenez à l’arrêt.", autoResume = false, keepLock = false } = {}) {
  if (gps.transition) throw new Error("Patientez pendant la mise à jour du trajet.");
  gps.transition = true;
  gps.tripId = id;
  gps.phase = "paused";
  gps.message = message;
  gps.autoResume = autoResume;
  stopGpsWatch();
  try {
    if (interrupted) queueGpsUpdate(id, { interrupted: true });
    await gps.queue;
    if (!keepLock) await releaseGpsLock();
  } finally {
    gps.transition = false;
    render();
  }
}
async function finishGpsTrip(id) {
  if (gps.transition || gps.finishTripId) throw new Error("Patientez pendant la mise à jour du trajet.");
  gps.transition = true;
  let opened = false;
  try {
    if (gps.tripId === id && gps.watchId !== null) {
      stopGpsWatch();
      gps.autoResume = false;
      gps.phase = "paused";
      gps.message = "GPS arrêté pour vérifier la distance.";
      await gps.queue;
    }
    if (!await acquireGpsLock()) throw new Error("Le GPS fonctionne dans une autre fenêtre. Terminez le trajet depuis cette fenêtre.");
    const fresh = await state.db.getTrip(id);
    if (!fresh || fresh.status !== "running" || fresh.method !== "gps") {
      await releaseGpsLock();
      throw new Error("Ce trajet n’est plus en cours. Rechargez VigieAuto.");
    }
    const index = state.records.trips.findIndex((x) => x.id === id);
    if (index >= 0) state.records.trips[index] = fresh;
    gps.tripId = id;
    gps.finishTripId = id; // le verrou reste tenu jusqu'à la fermeture du formulaire
    tripForm(id);
    opened = true;
  } finally {
    if (!opened) { gps.finishTripId = null; await releaseGpsLock(); }
    gps.transition = false;
    render();
  }
}
async function quiesceGps() {
  if (gps.transition || gps.finishTripId) throw new Error("Terminez d’abord la fenêtre de trajet GPS.");
  gps.transition = true;
  gps.autoResume = false;
  const interruptedId = gps.watchId !== null ? gps.tripId : null;
  stopGpsWatch();
  gps.phase = "paused";
  gps.message = "GPS arrêté. Reprenez à l’arrêt si vous souhaitez poursuivre la mesure.";
  try {
    if (interruptedId) queueGpsUpdate(interruptedId, { interrupted: true });
    await gps.queue;
    if (!await acquireGpsLock()) throw new Error("Un GPS est actif dans une autre fenêtre VigieAuto. Fermez cette fenêtre avant de continuer.");
  } catch (error) {
    gps.transition = false;
    throw error;
  }
}
async function endGpsMutation() {
  await releaseGpsLock();
  gps.transition = false;
  gps.tripId = null;
  gps.phase = "idle";
  gps.message = "";
}
function tripQuickCard() {
  const current = runningTrips()[0];
  const vehicle = current ? recordById("vehicles", current.vehicleId) : getVehicle();
  const caption = current
    ? `${current.method === "gps" ? "GPS facultatif" : "Chronomètre"} · ${esc(nameOf(vehicle))}`
    : "Chrono manuel · GPS disponible dans Trajets";
  return `<section class="card trip-quick"><div class="trip-quick-heading">${square("route")}<div><h2>${current ? "Trajet en cours" : "Trajet rapide"}</h2><p>${caption}</p></div></div>${current ? `<button class="btn small" data-action="finish-trip" data-id="${esc(current.id)}">Terminer ${I("arrow")}</button>` : `<button class="btn small" data-action="start-trip">Démarrer ${I("arrow")}</button>`}</section>`;
}
function tripsView() {
  const v = getVehicle();
  if (!v) return requireVehicleView("Trajets", "Suivez vos trajets manuellement ou avec le GPS facultatif.");
  const active = runningTrips();
  const all = sortRecent(scoped("trips").filter((x) => x.status === "complete"));
  const rows = all.filter((x) => state.tripFilter === "all" || x.profile === state.tripFilter);
  const km = all.reduce((sum, x) => sum + x.distanceKm, 0);
  const costPerKm = averageEnergyCostPerKm(scoped("fills"), carUnit());
  const running = active.map((x) => {
    const vehicle = recordById("vehicles", x.vehicleId);
    const gpsTrip = x.method === "gps";
    const watching = gpsTrip && gps.tripId === x.id && gps.watchId !== null;
    const details = gpsTrip ? `<div class="gps-live" data-gps-trip="${esc(x.id)}"><strong data-gps-distance>${number((x.gpsDistanceM || 0) / 1000, 2)} km estimés</strong><p data-gps-status>${esc(gpsStatusText(x))}</p><p class="gps-interrupted" data-gps-interrupted ${x.gpsInterrupted ? "" : "hidden"}>Mesure interrompue ou signal perdu : la distance peut être incomplète.</p></div>` : "";
    return `<section class="card trip-running">${square(gpsTrip ? "route" : "clock")}<div class="trip-running-copy"><h2>${gpsTrip ? "Trajet GPS en cours" : "Chronomètre en cours"}</h2><p>${esc(nameOf(vehicle))} · démarré le ${esc(startedLabel(x.startedAt))}. La durée peut être corrigée à l’arrivée.</p>${details}</div><div class="trip-running-actions">${gpsTrip ? `<button class="btn secondary small" data-action="${watching ? "pause-gps" : "resume-gps"}" data-id="${esc(x.id)}">${watching ? "Pause GPS" : "Reprendre GPS"}</button>` : ""}<button class="btn small" data-action="finish-trip" data-id="${esc(x.id)}">Terminer</button><button class="btn secondary small" data-action="delete-trip" data-id="${esc(x.id)}">Annuler</button></div></section>`;
  }).join("");
  return `${pageHeading("Trajets", `Vos déplacements de ${esc(nameOf(v))}, en toute simplicité.`, addButton("Ajouter un trajet passé", "add-trip"))}
    ${running || `<section class="card trip-start"><div>${square("route")}<div><h2>Prêt à prendre la route ?</h2><p>À l’arrêt, choisissez une saisie manuelle ou une estimation GPS facultative.</p></div></div><div class="trip-start-actions"><button class="btn" data-action="start-trip">${I("clock")} Chrono manuel</button><button class="btn secondary" data-action="prepare-gps">${I("route")} Avec GPS</button></div></section>`}
    <div class="alert-box info">${I("info")}<span><b>GPS facultatif.</b> Les coordonnées ne sont pas enregistrées. La mesure n’est pas garantie écran éteint ou application masquée ; vérifiez la distance à l’arrivée. Bluetooth et NFC ne sont pas encore activés. N’utilisez pas votre téléphone en conduisant.</span></div>
    <div class="summary-grid">${metric("Trajets enregistrés", number(all.length), "", "Pour ce véhicule", "route")}${metric("Distance enregistrée", number(km, 2), "km", "Total des trajets enregistrés", "speed")}${metric("Coût énergie moyen", costPerKm === null ? "—" : `${number(costPerKm, 3)} €`, "/ km", "Estimé d’après les pleins complets", "fuel")}</div>
    <div class="section-heading"><div><h2>Historique</h2><p>Distances confirmées et types de trajets déclarés par vous.</p></div></div>
    <div class="filterbar"><select data-filter="trips" aria-label="Filtrer par type de trajet"><option value="all">Tous les types</option>${Object.entries(TRIP_PROFILES).map(([key,label]) => `<option value="${esc(key)}" ${state.tripFilter === key ? "selected" : ""}>${esc(label)}</option>`).join("")}</select><span class="filter-count">${rows.length} trajet${rows.length === 1 ? "" : "s"}</span></div>
    <div class="card list-card">${rows.length ? rows.map((x) => {
      const route = [x.from, x.to].filter(Boolean).join(" → ");
      const estimated = costPerKm === null ? "" : `<br>Énergie estimée : environ ${money(x.distanceKm * costPerKm)}`;
      const method = x.method === "gps" ? (x.gpsHasFix ? "GPS · distance confirmée" : "GPS indisponible · distance saisie") : "Manuel";
      const interrupted = x.method === "gps" && x.gpsInterrupted ? " · Mesure interrompue" : "";
      return `<div class="list-row">${square("route")}<div class="list-main"><div class="list-title">${esc(x.title || route || "Trajet")}</div><div class="list-meta">${shortDate(x.date)} · ${number(x.distanceKm, 2)} km${x.durationMin != null ? ` · ${number(x.durationMin)} min` : ""} · ${esc(TRIP_PROFILES[x.profile])}<br>${method}${interrupted}${route && x.title ? `<br>${esc(route)}` : ""}${estimated}${x.notes ? `<br>${esc(x.notes)}` : ""}</div></div>${rowButtons("trip", x.id)}</div>`;
    }).join("") : empty("route", all.length ? "Aucun trajet de ce type" : "Vos trajets, au même endroit", all.length ? "Choisissez un autre filtre." : "Ajoutez un trajet passé ou démarrez un chronomètre.", all.length ? "" : "add-trip", "Ajouter un trajet")}</div>
    <div class="note-line">${I("info")} Le coût énergétique est une estimation calculée avec la moyenne des intervalles de pleins enregistrés, pas la consommation réelle du trajet. Il n’inclut pas les autres dépenses.</div>`;
}
function garageView() {
  return `${pageHeading("Mes véhicules", "Tous vos compagnons de route au même endroit.", addButton("Ajouter un véhicule", "add-vehicle"))}
  ${state.records.vehicles.length ? `<div class="vehicle-grid">${state.records.vehicles.map((v) => `<div class="card vehicle-tile"><div class="vehicle-tile-top">${square("car")}<div class="list-main"><h3>${esc(nameOf(v))}</h3><div class="list-meta">${esc(v.version || fuelLabel(v))} ${v.year ? `· ${esc(v.year)}` : ""} ${v.plate ? `· ${esc(v.plate)}` : ""}</div><div class="list-meta"><b>${number(v.odometer)} km</b></div></div>${v.id === state.activeId ? '<span class="tag">Actif</span>' : ""}</div><div class="tile-actions">${v.id !== state.activeId ? `<button class="btn small" data-action="select-vehicle" data-id="${esc(v.id)}">Choisir ce véhicule</button>` : '<span class="card-intro">Véhicule sélectionné</span>'}<span class="spacer"></span><button class="icon-button" data-action="edit-vehicle" data-id="${esc(v.id)}" aria-label="Modifier ${esc(nameOf(v))}">${I("edit")}</button><button class="icon-button" data-action="delete-vehicle" data-id="${esc(v.id)}" aria-label="Supprimer ${esc(nameOf(v))}">${I("trash")}</button></div></div>`).join("")}</div>` : `<div class="card">${empty("car", "Votre garage est vide", "Ajoutez votre premier véhicule pour commencer.", "add-vehicle", "Ajouter un véhicule")}</div>`}`;
}
function categoryFilter(name, values, selected) {
  return `<select data-filter="${name}" aria-label="Filtrer par catégorie"><option value="all">Toutes les catégories</option>${Object.entries(
    values,
  )
    .map(
      ([k, v]) =>
        `<option value="${k}" ${selected === k ? "selected" : ""}>${esc(v)}</option>`,
    )
    .join("")}</select>`;
}
function rowButtons(kind, id) {
  return `<div class="row-actions"><button class="icon-button" data-action="edit-${kind}" data-id="${esc(id)}" aria-label="Modifier">${I("edit")}</button><button class="icon-button" data-action="delete-${kind}" data-id="${esc(id)}" aria-label="Supprimer">${I("trash")}</button></div>`;
}
function serviceView() {
  if (!getVehicle())
    return requireVehicleView(
      "Carnet d’entretien",
      "Gardez une trace de chaque intervention.",
    );
  const all = sortRecent(scoped("services"));
  const rows = all.filter(
    (x) => state.serviceFilter === "all" || x.category === state.serviceFilter,
  );
  return `${pageHeading("Carnet d’entretien", `L’historique de ${esc(nameOf(getVehicle()))}.`, addButton("Ajouter une intervention", "add-service"))}
    <div class="summary-grid">${metric("Interventions", number(all.length), "", "Dans votre carnet", "wrench")}${metric("Dépenses entretien", money(all.reduce((s, x) => s + (Number(x.parts) || 0) + (Number(x.labor) || 0), 0)), "", "Pièces et main-d’œuvre", "receipt")}${metric("Dernière intervention", all[0] ? shortDate(all[0].date) : "—", "", "Selon la date enregistrée", "calendar")}</div>
    <div class="filterbar">${categoryFilter("services", SERVICE_CATEGORIES, state.serviceFilter)}<span class="filter-count">${rows.length} intervention${rows.length === 1 ? "" : "s"}</span></div>
    <div class="card list-card">${rows.length ? rows.map((x) => `<div class="list-row">${square("wrench")}<div class="list-main"><div class="list-title">${esc(x.title)}</div><div class="list-meta">${shortDate(x.date)} · ${number(x.odometer)} km · ${esc(SERVICE_CATEGORIES[x.category] || "Autre")}${x.place ? ` · ${esc(x.place)}` : ""}${x.notes ? `<br>${esc(x.notes)}` : ""}</div></div><div class="list-amount">${money((Number(x.parts) || 0) + (Number(x.labor) || 0))}</div>${rowButtons("service", x.id)}</div>`).join("") : empty("wrench", all.length ? "Aucun résultat" : "Votre carnet est prêt", all.length ? "Essayez une autre catégorie." : "Enregistrez votre première intervention.", "add-service", "Ajouter une intervention")}</div>
    <div class="note-line">${I("info")} Les échéances d’entretien dépendent du véhicule et de son usage : référez-vous au carnet constructeur.</div>`;
}
function fillsView() {
  const v = getVehicle();
  if (!v)
    return requireVehicleView(
      "Pleins & consommation",
      "Suivez votre consommation dans le temps.",
    );
  const all = sortRecent(scoped("fills")),
    unit = carUnit(),
    calc = fillIntervals(all, unit);
  const sum = all.reduce((s, x) => s + (Number(x.total) || 0), 0);
  const costPerKm = averageEnergyCostPerKm(all, unit);
  const title =
    v.fuel === "electrique"
      ? "Recharges & consommation"
      : "Pleins & consommation";
  return `${pageHeading(title, `Le suivi de ${esc(nameOf(v))}, plein après plein.`, addButton(v.fuel === "electrique" ? "Ajouter une recharge" : "Ajouter un plein", "add-fill"))}
    <div class="summary-grid fuel-summary-grid">${metric("Consommation moyenne", calc.average === null ? "—" : number(calc.average, 2), `${unit}/100 km`, "Moyenne pondérée sur intervalles valides", "fuel")}${metric("Coût énergie moyen", costPerKm === null ? "—" : `${number(costPerKm, 3)} €`, "/ km", "Intervalles valides, hors autres frais", "route")}${metric("Dépenses énergie", money(sum), "", "Tous les montants enregistrés", "receipt")}${metric("Enregistrements", number(all.length), "", "Pleins complets et partiels", "chart")}</div>
    <div class="alert-box info">${I("info")}<span><b>Comment est calculée la consommation ?</b> Entre deux ${unit === "kWh" ? "charges complètes" : "pleins complets"}, les ${unit === "kWh" ? "charges" : "pleins"} partiels intermédiaires sont inclus. Il faut saisir tous les ravitaillements et un kilométrage cohérent.${unit === "kWh" ? " La valeur correspond à l’énergie rechargée, pertes comprises." : ""}</span></div>
    <div class="section-heading"><div><h2>Historique</h2><p>Vos derniers passages à la ${unit === "kWh" ? "borne" : "pompe"}.</p></div></div>
    <div class="card list-card">${
      all.length
        ? all
            .map((x) => {
              const result = calc.byId[x.id];
              return `<div class="list-row">${square("fuel", "orange")}<div class="list-main"><div class="list-title">${number(x.volume, 2)} ${esc(x.unit || "L")} · ${x.full ? "Complet" : "Partiel"}</div><div class="list-meta">${shortDate(x.date)} · ${number(x.odometer)} km${x.station ? ` · ${esc(x.station)}` : ""}${result ? `<br><b>${number(result.consumption, 2)} ${esc(result.unit)}/100 km</b> · ${number(result.distance)} km parcourus` : ""}${x.notes ? `<br>${esc(x.notes)}` : ""}</div></div><div class="list-amount">${money(x.total)}</div>${rowButtons("fill", x.id)}</div>`;
            })
            .join("")
        : empty(
            "fuel",
            "Aucun plein pour le moment",
            "Ajoutez votre premier plein : la consommation apparaîtra après deux pleins complets.",
            "add-fill",
            "Ajouter un plein",
          )
    }</div>`;
}
function expensesView() {
  if (!getVehicle())
    return requireVehicleView(
      "Autres dépenses",
      "Assurance, péages, stationnement…",
    );
  const rows = sortRecent(scoped("expenses"));
  const sum = rows.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  return `${pageHeading("Autres dépenses", "Assurance, péages, stationnement… tout compte.", addButton("Ajouter une dépense", "add-expense"))}
    <div class="summary-grid">${metric("Total enregistré", money(sum), "", "Hors carburant et entretien", "receipt")}${metric("Dépenses", number(rows.length), "", "Pour ce véhicule", "chart")}${metric("Dernière dépense", rows[0] ? shortDate(rows[0].date) : "—", "", "Selon la date enregistrée", "calendar")}</div>
    <div class="card list-card">${rows.length ? rows.map((x) => `<div class="list-row">${square("receipt", "blue")}<div class="list-main"><div class="list-title">${esc(x.title)}</div><div class="list-meta">${shortDate(x.date)} · ${esc(EXPENSE_CATEGORIES[x.category] || "Autre")}${x.notes ? `<br>${esc(x.notes)}` : ""}</div></div><div class="list-amount">${money(x.amount)}</div>${rowButtons("expense", x.id)}</div>`).join("") : empty("receipt", "Aucune autre dépense", "Enregistrez une assurance, un péage ou un achat.", "add-expense", "Ajouter une dépense")}</div>`;
}
function remindersView() {
  const v = getVehicle();
  if (!v)
    return requireVehicleView(
      "Rappels",
      "Gardez les échéances à portée de main.",
    );
  const active = activeReminders();
  const done = sortRecent(
    scoped("reminders")
      .filter((x) => x.active === false)
      .map((x) => ({ ...x, date: x.updatedAt || x.createdAt || "" })),
  );
  const rows = [
    ...active,
    ...done.map((x) => ({ ...x, info: reminderInfo(x, v) })),
  ];
  return `${pageHeading("Mes rappels", "Parce qu’une échéance, ça se prépare.", addButton("Créer un rappel", "add-reminder"))}
    <div class="alert-box info">${I("info")}<span>Les échéances sont vérifiées <b>à l’ouverture de VigieAuto</b>. Cette version n’envoie pas de notification lorsque l’application est fermée.</span></div>
    <div class="card list-card">${rows.length ? rows.map((x) => `<div class="list-row">${square(x.category === "administratif" ? "calendar" : "bell", x.info.overdue ? "red" : x.info.soon ? "orange" : "")}<div class="list-main"><div class="list-title">${esc(x.title)} <span class="tag ${x.active === false ? "neutral" : x.info.status}">${x.active === false ? "Terminé" : x.info.overdue ? "En retard" : x.info.soon ? "À prévoir" : "À venir"}</span></div><div class="list-meta">${esc(x.info.label)}${x.repeatDays || x.repeatKm ? " · Récurrent" : ""}</div></div><div class="row-actions">${x.active !== false ? `<button class="btn secondary small" data-action="done-reminder" data-id="${esc(x.id)}">Fait</button>` : ""}<button class="icon-button" data-action="edit-reminder" data-id="${esc(x.id)}" aria-label="Modifier le rappel">${I("edit")}</button><button class="icon-button" data-action="delete-reminder" data-id="${esc(x.id)}" aria-label="Supprimer le rappel">${I("trash")}</button></div></div>`).join("") : empty("bell", "Aucun rappel pour le moment", "Créez une échéance par date, kilométrage ou les deux.", "add-reminder", "Créer un rappel")}</div>`;
}
function checksView() {
  if (!getVehicle())
    return requireVehicleView(
      "Contrôles qualité",
      "Des listes simples pour vérifier les essentiels.",
    );
  const templates = state.records.templates;
  const checks = sortRecent(scoped("checks"));
  return `${pageHeading("Contrôles qualité", "De bonnes habitudes pour partir l’esprit tranquille.", addButton("Créer une liste", "add-template"))}
    <div class="alert-box info">${I("shield")}<span>Adaptez ces listes à votre véhicule et suivez son manuel. Pour les niveaux, intervenez uniquement dans les conditions indiquées par le constructeur ; n’ouvrez jamais un circuit chaud.</span></div>
    <div class="section-heading"><div><h2>Mes listes de contrôle</h2><p>Choisissez une liste pour commencer.</p></div></div>
    <div class="content-grid">${templates.map((t) => `<div class="card template-card"><div style="display:flex;justify-content:space-between;align-items:start">${square("check", "purple")}<span class="template-meta">${t.items?.length || 0} points</span></div><div><h3>${esc(t.name)}</h3><p style="margin-top:6px">${esc(t.description || "Une liste personnalisée pour votre véhicule.")}</p></div><div class="tile-actions"><button class="btn small" data-action="run-check" data-id="${esc(t.id)}">Démarrer ${I("arrow")}</button><span class="spacer"></span><button class="icon-button" data-action="edit-template" data-id="${esc(t.id)}" aria-label="Modifier la liste">${I("edit")}</button><button class="icon-button" data-action="delete-template" data-id="${esc(t.id)}" aria-label="Supprimer la liste">${I("trash")}</button></div></div>`).join("")}</div>
    <div class="section-heading" style="margin-top:25px"><div><h2>Historique des contrôles</h2><p>Retrouvez les vérifications déjà réalisées.</p></div></div><div class="card list-card">${checks.length ? checks.map((x) => `<div class="list-row">${square("check", "purple")}<div class="list-main"><div class="list-title">${esc(x.templateName)}</div><div class="list-meta">${shortDate(x.date)} · ${number(x.odometer)} km</div></div><span class="tag ${x.status === "attention" ? "soon" : ""}">${x.status === "attention" ? "À vérifier" : "Terminé"}</span><div class="row-actions"><button class="icon-button" data-action="view-check" data-id="${esc(x.id)}" aria-label="Voir le contrôle">${I("eye")}</button><button class="icon-button" data-action="delete-check" data-id="${esc(x.id)}" aria-label="Supprimer le contrôle">${I("trash")}</button></div></div>`).join("") : empty("check", "Aucun contrôle enregistré", "Lancez une liste pour commencer votre historique.")}</div>`;
}
function symptomsView() {
  if (!getVehicle())
    return requireVehicleView(
      "Journal de symptômes",
      "Notez ce que vous observez.",
    );
  const rows = sortRecent(scoped("symptoms"));
  const active = rows.filter((x) => x.status !== "resolu");
  const resolved = rows.filter((x) => x.status === "resolu");
  function symptomRow(x) {
    const status =
      x.status === "resolu"
        ? "Résolu"
        : x.status === "observe"
          ? "Observé"
          : "En cours";
    const severity =
      { faible: "Faible", moyenne: "Moyenne", elevee: "Élevée" }[x.severity] ||
      "Non précisée";
    return `<div class="list-row">${square("symptom", x.severity === "elevee" ? "red" : "orange")}<div class="list-main"><div class="list-title">${esc(x.title)} <span class="tag ${x.severity === "elevee" ? "overdue" : x.status === "resolu" ? "neutral" : "soon"}">${status}</span></div><div class="list-meta">${shortDate(x.date)} · ${number(x.odometer)} km · ${esc(SYMPTOM_CATEGORIES[x.category] || "Autre")} · Gravité ${severity.toLowerCase()}${x.description ? `<br>${esc(x.description)}` : ""}</div></div><div class="row-actions">${x.status !== "resolu" ? `<button class="btn secondary small" data-action="resolve-symptom" data-id="${esc(x.id)}">Résolu</button>` : ""}<button class="icon-button" data-action="edit-symptom" data-id="${esc(x.id)}" aria-label="Modifier le symptôme">${I("edit")}</button><button class="icon-button" data-action="delete-symptom" data-id="${esc(x.id)}" aria-label="Supprimer le symptôme">${I("trash")}</button></div></div>`;
  }
  return `${pageHeading("Journal de symptômes", "Pour noter les signes et en parler au bon moment.", addButton("Ajouter un symptôme", "add-symptom"))}
    <div class="alert-box">${I("warning")}<span><b>VigieAuto ne pose pas de diagnostic.</b> En cas de voyant rouge, d’odeur de carburant, de fumée anormale ou d’un doute sur la sécurité, arrêtez-vous en sécurité et faites vérifier le véhicule par un professionnel.</span></div>
    <div class="section-heading"><div><h2>À surveiller</h2><p>${active.length} observation${active.length === 1 ? "" : "s"} en cours</p></div></div><div class="card list-card">${active.length ? active.map(symptomRow).join("") : empty("symptom", "Rien à signaler", "Vos observations en cours apparaîtront ici.")}</div>
    ${resolved.length ? `<div class="section-heading" style="margin-top:23px"><div><h2>Résolus</h2><p>Vos observations passées.</p></div></div><div class="card list-card">${resolved.map(symptomRow).join("")}</div>` : ""}`;
}
function documentsView() {
  if (!getVehicle())
    return requireVehicleView(
      "Mes documents",
      "Vos justificatifs, toujours sous la main.",
    );
  const rows = sortRecent(scoped("documents"));
  return `${pageHeading("Mes documents", "Carte grise, assurance et factures sur cet appareil.", addButton("Ajouter un document", "add-document"))}
    <div class="alert-box info">${I("shield")}<span>Les fichiers restent dans le stockage local du navigateur et sont inclus dans la sauvegarde JSON. Formats : JPG, PNG, WebP, GIF ou PDF, jusqu’à 5 Mo par fichier.</span></div>
    <div class="card list-card">${rows.length ? rows.map((x) => `<div class="list-row">${square("file", "blue")}<div class="list-main"><div class="list-title">${esc(x.title || x.filename)}</div><div class="list-meta">${esc(DOC_CATEGORIES[x.category] || "Autre")} · ${shortDate(x.date)} · ${number((Number(x.size) || 0) / 1024, 0)} Ko</div></div><div class="row-actions"><button class="icon-button" data-action="download-document" data-id="${esc(x.id)}" aria-label="Télécharger le document">${I("download")}</button><button class="icon-button" data-action="delete-document" data-id="${esc(x.id)}" aria-label="Supprimer le document">${I("trash")}</button></div></div>`).join("") : empty("file", "Votre porte-documents est vide", "Ajoutez une facture ou un justificatif.", "add-document", "Ajouter un document")}</div>`;
}
function statisticsView() {
  if (!getVehicle())
    return requireVehicleView("Statistiques", "Vos chiffres en un coup d’œil.");
  const data = scopedFinance(),
    all = spending(data),
    months = monthlySpending(data, 6),
    max = Math.max(...months.map((x) => x.total), 1),
    calc = fillIntervals(data.fills, carUnit());
  const fuelCost = calc.intervals.reduce((s, x) => s + x.cost, 0);
  const perKm = calc.distance ? fuelCost / calc.distance : null;
  return `${pageHeading("Statistiques", "Comprendre vos dépenses pour mieux anticiper.")}
    <div class="summary-grid">${metric("Dépenses enregistrées", money(all.total), "", "Toutes périodes confondues", "receipt")}${metric("Consommation moyenne", calc.average === null ? "—" : number(calc.average, 2), `${carUnit()}/100 km`, "Sur intervalles complets", "fuel")}${metric("Énergie par kilomètre", perKm === null ? "—" : number(perKm, 3), "€/km", "Sur intervalles complets uniquement", "speed")}</div>
    <div class="split-layout"><div class="card page-card"><div class="card-head"><div><h2>Évolution des dépenses</h2><p class="card-kicker">Montants saisis sur les 6 derniers mois</p></div>${I("chart")}</div><div class="bar-chart">${months.map((m, i) => `<div class="bar-col"><div class="bar ${i === months.length - 1 ? "current" : ""}" style="height:${Math.max(3, (m.total / max) * 105)}px" title="${esc(m.label)} : ${money(m.total)}"></div><span class="bar-label">${esc(m.label)}</span></div>`).join("")}</div><div class="bar-caption"><span>Carburant, entretien et autres dépenses</span><span>Max. ${money(max === 1 && months.every((x) => x.total === 0) ? 0 : max)}</span></div></div>${spendingCard()}</div>
    <div class="note-line">${I("info")} Ces chiffres ne comprennent que les données saisies ; ils ne constituent pas un coût total de possession exhaustif.</div>`;
}
function settingsView() {
  return `${pageHeading("Paramètres", "Vos données et vos préférences, en toute simplicité.")}
    <section class="card settings-section theme-settings"><h2>Thème de l’application</h2><p>Choisissez l’ambiance qui vous plaît. Le choix est enregistré sur cet appareil.</p><fieldset class="theme-options"><legend>Choisir un thème</legend>
      ${[["sauge", "Sauge", "Clair ou sombre selon le téléphone", "sauge"], ["cyan", "Cyan", "Clair ou sombre selon le téléphone", "cyan"], ["auto", "Automatique (mixte)", "Sauge clair · Cyan sombre", "auto"]].map(([value, name, desc, swatch]) => `<label class="theme-option"><input type="radio" name="theme" value="${value}" data-setting="theme" ${state.themePreference === value ? "checked" : ""}><span class="theme-swatch ${swatch}" aria-hidden="true"><i></i><i></i></span><span class="theme-option-copy"><strong>${name}</strong><small>${desc}</small></span></label>`).join("")}
    </fieldset><p class="theme-explanation">Sauge et Cyan suivent le mode clair ou sombre de votre téléphone. Le choix mixte conserve Sauge en clair et Cyan en sombre. Thème actuellement affiché : <strong id="current-theme">${THEME_LABELS[document.documentElement.dataset.theme] || "Sauge clair"}</strong>.</p></section>
    <div class="card settings-section"><h2>Sauvegarder et restaurer</h2><p>Exportez régulièrement une sauvegarde complète, y compris vos documents et listes. Conservez ce fichier dans un endroit sûr : il contient vos informations personnelles et n’est pas chiffré.</p><div class="settings-actions"><button class="btn" data-action="export">${I("download")} Exporter mes données</button><button class="btn secondary" data-action="import">${I("upload")} Importer une sauvegarde</button></div><p style="margin-top:12px">L’import d’un fichier VigieAuto remplace toutes les données présentes sur cet appareil. Une sauvegarde ne se fait pas automatiquement.</p></div>
    <div class="card settings-section"><h2>Installer VigieAuto</h2><p>Ouvrez cette application en HTTPS, puis ajoutez-la à votre écran d’accueil. La première ouverture et la mise en cache nécessitent une connexion.</p><ul class="settings-list"><li><b>Android :</b> menu du navigateur → « Installer l’application » ou « Ajouter à l’écran d’accueil ».</li><li><b>iPhone :</b> dans Safari, bouton Partager → « Sur l’écran d’accueil ».</li><li>Après installation sur iPhone, vérifiez vos données : le stockage de la version installée peut être séparé de celui de l’onglet.</li></ul>${state.installPrompt ? `<div class="settings-actions"><button class="btn" data-action="install">${I("download")} Installer l’application</button></div>` : ""}</div>
    <div class="card settings-section"><h2>Vie privée et hors-ligne</h2><p>Pas de compte, pas de synchronisation et aucune publicité dans cette application. Les informations saisies sont enregistrées dans le navigateur de cet appareil. Leur perte, l’effacement du navigateur ou une suppression du stockage peuvent les effacer : exportez vos données régulièrement.</p><p style="margin-top:10px">Les rappels sont visibles dans l’application : aucune notification en arrière-plan n’est prévue dans cette version.</p></div>
    <div class="card settings-section"><h2>Zone sensible</h2><p>Cette opération supprime les véhicules et leurs données locales. Elle est irréversible sans sauvegarde.</p><div class="settings-actions"><button class="btn danger" data-action="reset-all">${I("trash")} Effacer toutes les données</button></div></div>
    <div class="note-line">${I("spark")} VigieAuto · version <strong id="app-version">${APP_VERSION}</strong> · fait pour prendre soin de votre véhicule.</div>`;
}
function moreView() {
  const items = NAV_GROUPS.flatMap(([, x]) => x).filter(
    ([r]) => !["accueil", "entretien", "pleins", "trajets", "parametres"].includes(r),
  );
  return `${pageHeading("Tout votre carnet", "Retrouvez toutes les fonctions de VigieAuto.")}<div class="content-grid">${items.map(([route, icon, label]) => `<button class="quick-action" data-route="${route}">${square(icon)}<span><span class="action-label">${esc(label)}</span><small>Ouvrir la rubrique</small></span><span class="arrow">${I("arrow")}</span></button>`).join("")}</div>`;
}
function render() {
  if (!state.records) return;
  const views = {
    accueil: dashboard,
    garage: garageView,
    entretien: serviceView,
    pleins: fillsView,
    trajets: tripsView,
    depenses: expensesView,
    rappels: remindersView,
    controles: checksView,
    symptomes: symptomsView,
    documents: documentsView,
    statistiques: statisticsView,
    parametres: settingsView,
    plus: moreView,
  };
  state.route = views[state.route] ? state.route : "accueil";
  app.innerHTML = shell(views[state.route]());
  document.title = `${PAGE_LABELS[state.route] || "Accueil"} — VigieAuto`;
}
// Formulaires et dialogue accessibles au clavier.
function field(name, label, value = "", options = {}) {
  const {
    type = "text",
    required = false,
    placeholder = "",
    min,
    max,
    step,
    full = false,
    help = "",
    accept = "",
    extra = "",
  } = options;
  return `<div class="field ${full ? "full-width" : ""}"><label for="f-${name}">${label}${required ? ' <span aria-hidden="true">*</span>' : ""}</label><input id="f-${name}" name="${name}" type="${type}" ${type !== "file" ? `value="${esc(value)}"` : ""} ${required ? "required" : ""} ${placeholder ? `placeholder="${esc(placeholder)}"` : ""} ${min !== undefined ? `min="${esc(min)}"` : ""} ${max !== undefined ? `max="${esc(max)}"` : ""} ${step !== undefined ? `step="${esc(step)}"` : ""} ${accept ? `accept="${esc(accept)}"` : ""} ${extra}>${help ? `<small>${help}</small>` : ""}</div>`;
}
function area(name, label, value = "", options = {}) {
  return `<div class="field ${options.full === false ? "" : "full-width"}"><label for="f-${name}">${label}${options.required ? " *" : ""}</label><textarea id="f-${name}" name="${name}" ${options.required ? "required" : ""} ${options.placeholder ? `placeholder="${esc(options.placeholder)}"` : ""}>${esc(value)}</textarea>${options.help ? `<small>${options.help}</small>` : ""}</div>`;
}
function selectField(name, label, value, choices, options = {}) {
  return `<div class="field ${options.full ? "full-width" : ""}"><label for="f-${name}">${label}${options.required ? " *" : ""}</label><select id="f-${name}" name="${name}" ${options.required ? "required" : ""}>${Object.entries(
    choices,
  )
    .map(
      ([k, v]) =>
        `<option value="${esc(k)}" ${String(k) === String(value) ? "selected" : ""}>${esc(v)}</option>`,
    )
    .join(
      "",
    )}</select>${options.help ? `<small>${options.help}</small>` : ""}</div>`;
}
function checkbox(name, label, checked = false, full = true) {
  return `<label class="checkbox-line ${full ? "field full-width" : ""}"><input type="checkbox" name="${name}" ${checked ? "checked" : ""}><span>${label}</span></label>`;
}
function formModal({
  title,
  subtitle = "",
  form,
  id = "",
  body,
  submit = "Enregistrer",
}) {
  modal.innerHTML = `<form class="modal-shell" data-form="${form}" data-id="${esc(id)}"><div class="modal-header"><div><h2 id="dialog-title">${title}</h2><p>${subtitle}${state.demo ? " · Mode découverte : modifications non sauvegardées." : ""}</p></div><button type="button" class="icon-button" data-action="close-modal" aria-label="Fermer">${I("close")}</button></div><div class="modal-body"><div class="form-error" role="alert"></div>${body}</div><div class="modal-footer"><button type="button" class="btn secondary" data-action="close-modal">Annuler</button><button type="submit" class="btn">${submit}</button></div></form>`;
  if (!modal.open) modal.showModal();
}
function contentModal(title, subtitle, body) {
  modal.innerHTML = `<div class="modal-shell"><div class="modal-header"><div><h2 id="dialog-title">${title}</h2><p>${subtitle}</p></div><button class="icon-button" data-action="close-modal" aria-label="Fermer">${I("close")}</button></div><div class="modal-body">${body}</div><div class="modal-footer"><button class="btn secondary" data-action="close-modal">Fermer</button></div></div>`;
  if (!modal.open) modal.showModal();
}
function quickMenu() {
  const items = [
    ["route", "add-trip", "Ajouter un trajet", "Saisie manuelle"],
    ["fuel", "add-fill", getVehicle()?.fuel === "electrique" ? "Ajouter une recharge" : "Ajouter un plein", "Énergie et consommation"],
    ["wrench", "add-service", "Ajouter un entretien", "Intervention ou réparation"],
    ["symptom", "add-symptom", "Signaler un symptôme", "Noter une observation"],
    ["receipt", "add-expense", "Ajouter une dépense", "Assurance, péage et autres"],
  ];
  contentModal("Ajouter rapidement", "Choisissez ce que vous souhaitez enregistrer.", `<div class="quick-menu-list">${items.map(([icon, action, title, subtitle]) => `<button type="button" class="quick-menu-item" data-action="${action}">${square(icon)}<span><strong>${title}</strong><small>${subtitle}</small></span>${I("arrow")}</button>`).join("")}</div>`);
}
function tripForm(id = "") {
  const x = recordById("trips", id) || {};
  const running = x.status === "running", gpsTrip = x.method === "gps";
  const owner = x.vehicleId ? recordById("vehicles", x.vehicleId) : getVehicle();
  const duration = running ? Math.max(1, Math.round((Date.now() - Date.parse(x.startedAt)) / 60000)) : (x.durationMin ?? "");
  const gpsKm = Math.round((x.gpsDistanceM || 0) / 10) / 100;
  const distance = running && gpsTrip ? (gpsKm >= 0.01 ? gpsKm.toFixed(2) : "") : (x.distanceKm ?? "");
  const gpsHelp = gpsTrip ? (x.gpsInterrupted ? "Mesure interrompue : distance potentiellement incomplète. Vérifiez et corrigez-la." : x.gpsHasFix ? "Distance GPS indicative : vérifiez-la et corrigez-la si nécessaire." : "Pas de distance GPS exploitable : saisissez-la manuellement.") : "";
  formModal({
    title: running ? "Terminer le trajet" : x.id ? "Modifier le trajet" : "Ajouter un trajet passé",
    subtitle: `${esc(nameOf(owner))} · ${gpsTrip ? "Distance GPS à confirmer" : "Saisie manuelle"}`, form: "trip", id,
    submit: running ? "Enregistrer le trajet" : "Enregistrer",
    body: `<div class="form-grid">
      ${field("title", "Nom du trajet", x.title || "", { full: true, placeholder: "Domicile — travail (facultatif)" })}
      ${field("date", "Date", x.date || today(), { type: "date", required: true })}
      ${field("distanceKm", "Distance (km)", distance, { type: "number", min: 0.01, step: "0.01", required: true, placeholder: "À saisir", help: gpsHelp })}
      ${field("durationMin", "Durée (minutes)", duration, { type: "number", min: 1, step: 1, help: running ? "Durée depuis le démarrage, pauses comprises ; corrigez-la si besoin." : "Facultatif." })}
      ${selectField("profile", "Type de trajet déclaré", x.profile || "inconnu", TRIP_PROFILES, { help: "Indicatif : ne mesure pas l’état du moteur." })}
      ${field("from", "Départ", x.from || "", { placeholder: "Facultatif" })}${field("to", "Arrivée", x.to || "", { placeholder: "Facultatif" })}
      ${area("notes", "Notes", x.notes || "", { placeholder: "Conditions, charge, climatisation… (facultatif)" })}
      <p class="form-help">Aucune coordonnée GPS n’est enregistrée. Les champs que vous saisissez restent sur cet appareil.</p>
    </div>`,
  });
}
function gpsIntro() {
  if (state.demo) {
    toast("Pour utiliser le GPS, commencez avec votre véhicule : le mode découverte n’est pas sauvegardé.", true);
    return;
  }
  if (!window.isSecureContext || !navigator.geolocation?.watchPosition) {
    contentModal("GPS indisponible", "Le mode manuel reste disponible", `<div class="gps-intro"><p>Utilisez l’application installée depuis une adresse HTTPS et un navigateur compatible, puis vérifiez les réglages de localisation du téléphone.</p></div>`);
    return;
  }
  contentModal("Trajet avec GPS", `Pour ${esc(nameOf(getVehicle()))} · uniquement à votre demande`, `<div class="gps-intro">
    <p>Le téléphone demandera l’autorisation de localisation après votre choix ci-dessous. La distance reste une <b>estimation</b>, à vérifier à l’arrivée.</p>
    <ul><li>Le total estimé et les interruptions sont conservés localement ; aucune coordonnée ni trace du parcours n’est enregistrée automatiquement.</li>
    <li>La mesure est suspendue lorsque la page est masquée ; elle peut aussi s’interrompre si l’écran s’éteint ou si le signal est faible. Elle peut être incomplète.</li>
    <li>Gardez une seule fenêtre VigieAuto ouverte pendant le suivi ; le GPS peut consommer davantage de batterie.</li>
    <li>Utilisez le téléphone uniquement à l’arrêt. Le mode manuel reste disponible.</li></ul>
    <button type="button" class="btn" data-action="activate-gps">${I("route")} Autoriser et démarrer</button>
  </div>`);
}
async function startTrip(method = "manual") {
  if (state.startingTrip) return null;
  if (!["manual", "gps"].includes(method)) throw new Error("Mode de trajet invalide.");
  if (method === "gps" && state.demo) throw new Error("Ajoutez d’abord votre véhicule pour utiliser le GPS.");
  state.startingTrip = true;
  try {
    if (runningTrips().length) {
      go("trajets"); toast("Un trajet est déjà en cours. Terminez-le ou annulez-le avant d’en démarrer un autre.", true); return null;
    }
    const now = new Date().toISOString();
    const record = {
      id: uid(), vehicleId: getVehicle().id, date: today(), status: "running", method,
      startedAt: now, title: "", from: "", to: "", distanceKm: null, durationMin: null,
      profile: "inconnu", notes: "", createdAt: now, updatedAt: now,
      ...(method === "gps" ? { gpsDistanceM: 0, gpsHasFix: false, gpsInterrupted: false } : {}),
    };
    if (state.demo) await apply([put("trips", record)]);
    else {
      try { await state.db.startTrip(record); }
      catch (error) {
        if (error.code === "TRIP_ALREADY_RUNNING") {
          const fresh = await state.db.readAll();
          state.records.trips = fresh.trips;
          go("trajets");
        }
        throw error;
      }
      state.records.trips.push(record);
    }
    render();
    if (method === "manual") toast(state.demo ? "Chronomètre d’exemple démarré : il ne sera pas sauvegardé." : "Chronomètre démarré. Vous saisirez la distance à l’arrivée.");
    return record;
  } finally { state.startingTrip = false; }
}
function currentSuggestions() {
  return state.records.settings.find((item) => item.id === SUGGESTION_SETTING_ID) || null;
}
function suggestionField(name, label, value, { disabled = false } = {}) {
  const other = name === "brand" ? AUTRE_MARQUE : AUTRE_MODELE;
  return `<div class="field suggestion-field"><label for="f-${name}">${label} <span aria-hidden="true">*</span></label>
    <input id="f-${name}" name="${name}" value="${esc(value)}" list="${name}-suggestions" autocomplete="off" required ${disabled ? "disabled" : ""} placeholder="Rechercher ou saisir librement">
    <datalist id="${name}-suggestions"></datalist>
    <button type="button" class="suggestion-free" data-action="free-${name}">${esc(other)}</button>
    <small>${name === "brand" ? "Suggestions locales ou saisie libre." : "Choisissez d’abord une marque ; vous pouvez saisir un autre modèle."}</small></div>`;
}
function updateVehicleOptions(form, { brandChanged = false } = {}) {
  const brand = form.elements.brand, model = form.elements.model, suggestions = currentSuggestions();
  const key = normalise(brand.value);
  if (brandChanged && model.dataset.brandKey !== key) model.value = "";
  model.dataset.brandKey = key;
  model.disabled = !key;
  form.querySelector('[data-action="free-model"]').disabled = !key;
  // « Autre… » est un bouton séparé, pas un texte réservé dans le datalist :
  // même une marque qui porterait littéralement ce nom peut être saisie.
  const options = (values) => values.map((v) => `<option value="${esc(v)}"></option>`).join("");
  form.querySelector("#brand-suggestions").innerHTML = options(brandSuggestions(state.catalogue, suggestions, brand.value));
  form.querySelector("#model-suggestions").innerHTML = options(modelSuggestions(state.catalogue, suggestions, brand.value, model.value));
  const custom = form.querySelector("#fuel-custom-field");
  custom.hidden = form.elements.fuel.value !== "autre";
  form.elements.fuelCustom.disabled = custom.hidden;
}
function vehicleForm(id = "") {
  const x = recordById("vehicles", id) || {};
  const edit = !!x.id, memory = currentSuggestions();
  const brand = edit ? x.brand : (memory?.lastBrand || "");
  const model = edit ? x.model : (memory?.lastModel || "");
  const choice = edit ? fuelChoice(x) : "diesel";
  const fuelOptions = Object.fromEntries(Object.keys(FUEL_CHOICES).map((key, index) => [key, state.catalogue.fuels[index] || FUEL_CHOICES[key]]));
  formModal({
    title: edit ? "Modifier mon véhicule" : "Ajouter mon véhicule",
    subtitle: "Suggestions locales ; vous pouvez toujours saisir un autre choix.",
    form: "vehicle", id, submit: edit ? "Enregistrer" : "Créer mon véhicule",
    body: `<div class="form-grid">
    ${!edit && !brand ? `<div class="full-width example-choice"><button type="button" class="btn secondary small" data-action="use-clio-example">Utiliser l’exemple Renault Clio 2008</button><p class="form-help">Exemple à vérifier : aucun véhicule n’est créé automatiquement et le kilométrage reste à saisir.</p></div>` : ""}
    ${suggestionField("brand", "Marque", brand)}${suggestionField("model", "Modèle", model, { disabled: !normalise(brand) })}
    ${field("version", "Finition / motorisation", x.version, { placeholder: "1.5 dCi 68" })}${field("year", "Année", x.year, { type: "number", min: 0, step: 1, placeholder: "2008" })}
    ${field("plate", "Immatriculation", x.plate, { placeholder: "AB-123-CD" })}${selectField("fuel", "Énergie", choice, fuelOptions)}
    <div id="fuel-custom-field" class="full-width" ${choice === "autre" ? "" : "hidden"}>${field("fuelCustom", "Autre énergie", x.fuel === "autre" ? x.fuelDetail : "", { placeholder: "Saisissez votre énergie" })}</div>
    ${field("odometer", "Kilométrage actuel (km)", x.odometer ?? "", { type: "number", min: 0, step: 1, required: true, help: "Obligatoire ; vous pourrez le mettre à jour plus tard." })}${field("vin", "Numéro de série (VIN)", x.vin, { placeholder: "Facultatif" })}
    ${field("photo", "Photo du véhicule", "", { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif", full: true, help: "Facultatif · image jusqu’à 5 Mo, stockée uniquement sur cet appareil." })}
    ${validPhoto(x.photo) ? checkbox("removePhoto", "Supprimer la photo actuelle.") : ""}${area("notes", "Notes", x.notes, { placeholder: "Informations utiles…" })}
    <p class="form-help">Vos marques et modèles sont mémorisés après l’enregistrement et inclus dans la sauvegarde JSON.</p>
  </div>`,
  });
  updateVehicleOptions(modal.querySelector('form[data-form="vehicle"]'));
}
function serviceForm(id = "") {
  const x = recordById("services", id) || {};
  const edit = !!x.id;
  const v = getVehicle();
  formModal({
    title: edit ? "Modifier une intervention" : "Ajouter une intervention",
    subtitle: esc(nameOf(v)),
    form: "service",
    id,
    body: `<div class="form-grid">
    ${field("title", "Intitulé", x.title, { required: true, full: true, placeholder: "Vidange et filtre à huile" })}
    ${selectField("category", "Catégorie", x.category || "vidange", SERVICE_CATEGORIES)}${field("date", "Date", x.date || today(), { type: "date", required: true })}
    ${field("odometer", "Kilométrage (km)", x.odometer ?? v.odometer, { type: "number", min: 0, step: 1, required: true })}${field("place", "Lieu / intervenant", x.place, { placeholder: "Garage, moi-même…" })}
    ${field("parts", "Coût des pièces (€)", x.parts ?? 0, { type: "number", min: 0, step: "0.01", required: true })}${field("labor", "Main-d’œuvre (€)", x.labor ?? 0, { type: "number", min: 0, step: "0.01", required: true })}
    ${area("notes", "Notes", x.notes, { placeholder: "Détails de l’intervention…" })}
    ${!edit ? `<hr class="form-divider"><div class="form-section-title">Prévoir la prochaine échéance <span style="color:var(--muted);font-weight:500">(facultatif)</span></div>${field("reminderDate", "Date du rappel", "", { type: "date" })}${field("reminderKm", "Kilométrage du rappel (km)", "", { type: "number", min: 0, step: 1 })}<p class="form-help">Fixez vous-même les échéances selon le carnet constructeur. Un rappel sera créé si au moins une valeur est renseignée.</p>` : ""}
  </div>`,
  });
}
function fillForm(id = "") {
  const x = recordById("fills", id) || {};
  const v = getVehicle();
  const unit = x.unit || carUnit();
  const electric = unit === "kWh";
  formModal({
    title: x.id
      ? electric
        ? "Modifier une recharge"
        : "Modifier un plein"
      : electric
        ? "Ajouter une recharge"
        : "Ajouter un plein",
    subtitle: esc(nameOf(v)),
    form: "fill",
    id,
    body: `<div class="form-grid">
    ${field("date", "Date", x.date || today(), { type: "date", required: true })}${field("odometer", "Kilométrage (km)", x.odometer ?? v.odometer, { type: "number", min: 0, step: 1, required: true })}
    ${field("volume", `Quantité (${unit})`, x.volume ?? "", { type: "number", min: 0.01, step: "0.01", required: true, placeholder: electric ? "30,00" : "45,00" })}${field("unitPrice", `Prix par ${unit} (€)`, x.unitPrice ?? "", { type: "number", min: 0, step: "0.001", placeholder: "Facultatif" })}
    ${field("total", "Prix total (€)", x.total ?? "", { type: "number", min: 0, step: "0.01", required: true, help: "Calculé si quantité et prix unitaire sont indiqués ; vous pouvez le modifier." })}${field("station", electric ? "Borne" : "Station-service", x.station, { placeholder: "Facultatif" })}
    ${checkbox("full", electric ? "Batterie rechargée à 100 %" : "Plein complet", x.id ? !!x.full : true)}
    <p class="form-help">${electric ? "La consommation est estimée entre deux charges à 100 %, en incluant les charges intermédiaires." : "Les pleins partiels sont pris en compte entre deux pleins complets."}</p>
    ${area("notes", "Notes", x.notes, { placeholder: "Une précision à conserver…" })}
  </div>`,
  });
}
function expenseForm(id = "") {
  const x = recordById("expenses", id) || {};
  formModal({
    title: x.id ? "Modifier une dépense" : "Ajouter une dépense",
    subtitle: esc(nameOf(getVehicle())),
    form: "expense",
    id,
    body: `<div class="form-grid">
    ${field("title", "Intitulé", x.title, { required: true, full: true, placeholder: "Assurance auto" })}${selectField("category", "Catégorie", x.category || "assurance", EXPENSE_CATEGORIES)}${field("date", "Date", x.date || today(), { type: "date", required: true })}${field("amount", "Montant (€)", x.amount ?? "", { type: "number", min: 0, step: "0.01", required: true })}${area("notes", "Notes", x.notes, { placeholder: "Facultatif…" })}</div>`,
  });
}
function reminderForm(id = "") {
  const x = recordById("reminders", id) || {};
  formModal({
    title: x.id ? "Modifier un rappel" : "Créer un rappel",
    subtitle: "Par date, par kilométrage, ou les deux.",
    form: "reminder",
    id,
    body: `<div class="form-grid">
    ${field("title", "Intitulé", x.title, { required: true, full: true, placeholder: "Prochaine vidange" })}${selectField("category", "Type", x.category || "entretien", { entretien: "Entretien", administratif: "Administratif", cq: "Contrôle qualité", autre: "Autre" })}
    <div class="field"></div>${field("dueDate", "Date d’échéance", x.dueDate || "", { type: "date" })}${field("dueKm", "Kilométrage d’échéance (km)", x.dueKm ?? "", { type: "number", min: 0, step: 1 })}
    ${field("warnDays", "Avertir avant (jours)", x.warnDays ?? 30, { type: "number", min: 0, step: 1 })}${field("warnKm", "Avertir avant (km)", x.warnKm ?? 500, { type: "number", min: 0, step: 1 })}
    <hr class="form-divider"><div class="form-section-title">Récurrence facultative</div>
    ${field("repeatDays", "Tous les… jours", x.repeatDays || "", { type: "number", min: 0, step: 1, placeholder: "Pas de récurrence" })}${field("repeatKm", "Tous les… km", x.repeatKm || "", { type: "number", min: 0, step: 1, placeholder: "Pas de récurrence" })}
    <p class="form-help">Indiquez au moins une échéance. Si vous marquez un rappel récurrent comme fait, la prochaine échéance sera calculée depuis aujourd’hui et le compteur actuel. Les dimensions sans intervalle ne seront pas reconduites.</p>
    ${checkbox("active", "Rappel actif", x.id ? x.active !== false : true)}
  </div>`,
  });
}
function symptomForm(id = "") {
  const x = recordById("symptoms", id) || {};
  const v = getVehicle();
  formModal({
    title: x.id ? "Modifier un symptôme" : "Ajouter un symptôme",
    subtitle: "Une observation utile à partager avec un professionnel.",
    form: "symptom",
    id,
    body: `<div class="form-grid">
    ${field("title", "Observation", x.title, { required: true, full: true, placeholder: "Bruit, voyant, odeur…" })}${selectField("category", "Catégorie", x.category || "bruit", SYMPTOM_CATEGORIES)}${selectField("severity", "Gravité estimée", x.severity || "moyenne", { faible: "Faible", moyenne: "Moyenne", elevee: "Élevée" })}
    ${field("date", "Date d’observation", x.date || today(), { type: "date", required: true })}${field("odometer", "Kilométrage (km)", x.odometer ?? v.odometer, { type: "number", min: 0, step: 1, required: true })}
    ${selectField("status", "Statut", x.status || "en_cours", { observe: "Observé", en_cours: "En cours", resolu: "Résolu" })}${area("description", "Conditions et détails", x.description, { placeholder: "À chaud, au démarrage, à l’arrêt…" })}
    <p class="form-help">VigieAuto ne remplace pas un diagnostic. En cas de doute sur la sécurité, arrêtez-vous en sécurité et consultez un professionnel.</p>
  </div>`,
  });
}
function templateForm(id = "") {
  const x = recordById("templates", id) || {};
  formModal({
    title: x.id ? "Modifier la liste" : "Créer une liste",
    subtitle: "Personnalisez vos propres points de contrôle.",
    form: "template",
    id,
    body: `<div class="form-grid">
    ${field("name", "Nom de la liste", x.name, { required: true, full: true, placeholder: "Avant un week-end" })}${area("description", "Description", x.description, { placeholder: "Quand utiliser cette liste ?" })}${area("items", "Points à vérifier", x.items?.map((i) => i.title).join("\n") || "", { required: true, placeholder: "Un point par ligne\nPression des pneus\nNiveau de lave-glace", help: "Écrivez un point par ligne, de 1 à 30 points. Les contrôles déjà enregistrés garderont leur contenu." })}</div>`,
  });
}
function checkForm(id) {
  const t = recordById("templates", id);
  if (!t) return;
  const v = getVehicle();
  const items = t.items
    .map(
      (item, i) =>
        `<div class="check-item"><div class="check-title">${i + 1}. ${esc(item.title)}</div><div class="radio-options" role="radiogroup" aria-label="${esc(item.title)}"><label><input type="radio" name="result-${i}" value="ok" required> OK</label><label><input type="radio" name="result-${i}" value="nok"> À vérifier</label><label><input type="radio" name="result-${i}" value="na"> Non applicable</label></div><input type="text" name="note-${i}" aria-label="Note pour ${esc(item.title)}" placeholder="Note facultative"></div>`,
    )
    .join("");
  formModal({
    title: esc(t.name),
    subtitle: `${t.items.length} points à vérifier · ${esc(nameOf(v))}`,
    form: "check",
    id,
    submit: "Terminer le contrôle",
    body: `<div class="form-grid">${field("date", "Date", today(), { type: "date", required: true })}${field("odometer", "Kilométrage (km)", v.odometer, { type: "number", min: 0, step: 1, required: true })}</div><div style="margin-top:15px">${items}</div>`,
  });
}
function showCheck(id) {
  const x = recordById("checks", id);
  if (!x) return;
  contentModal(
    esc(x.templateName),
    `${shortDate(x.date)} · ${number(x.odometer)} km`,
    `${x.results.map((r) => `<div class="check-result"><div><b>${esc(r.title)}</b>${r.note ? `<br><span style="color:var(--muted)">${esc(r.note)}</span>` : ""}</div><span class="tag ${r.status === "nok" ? "soon" : r.status === "na" ? "neutral" : ""}">${r.status === "ok" ? "OK" : r.status === "nok" ? "À vérifier" : "N/A"}</span></div>`).join("")}`,
  );
}
function documentForm() {
  formModal({
    title: "Ajouter un document",
    subtitle: "Le fichier restera sur cet appareil.",
    form: "document",
    body: `<div class="form-grid">
    ${field("title", "Nom du document", "", { required: true, full: true, placeholder: "Carte grise, facture…" })}${selectField("category", "Catégorie", "facture", DOC_CATEGORIES)}${field("date", "Date", today(), { type: "date", required: true })}
    ${field("file", "Fichier", "", { type: "file", required: true, full: true, accept: "image/jpeg,image/png,image/webp,image/gif,application/pdf", help: "JPG, PNG, WebP, GIF ou PDF · 5 Mo maximum." })}</div>`,
  });
}
function asNumber(data, name, { optional = false, min = 0 } = {}) {
  const raw = String(data.get(name) ?? "").trim();
  if (optional && raw === "") return null;
  if (raw === "")
    throw new Error("Merci de remplir tous les champs obligatoires.");
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min)
    throw new Error("Vérifiez les valeurs numériques du formulaire.");
  return n;
}
function text(data, name, required = false) {
  const value = String(data.get(name) ?? "").trim();
  if (required && !value)
    throw new Error("Merci de remplir tous les champs obligatoires.");
  return value;
}
function dateValue(data, name, required = false) {
  const value = text(data, name, required);
  if (value && !validDate(value)) throw new Error("Vérifiez la date saisie.");
  return value;
}
function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return false;
  const [y, m, d] = s.split("-").map(Number),
    test = new Date(Date.UTC(y, m - 1, d));
  return (
    test.getUTCFullYear() === y &&
    test.getUTCMonth() === m - 1 &&
    test.getUTCDate() === d
  );
}
async function readAttachment(file, imagesOnly = false) {
  if (!file || !file.size) throw new Error("Choisissez un fichier non vide.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Le fichier dépasse 5 Mo.");
  const types = imagesOnly
    ? ["image/jpeg", "image/png", "image/webp", "image/gif"]
    : ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!types.includes(file.type))
    throw new Error(
      imagesOnly
        ? "Choisissez une image JPG, PNG, WebP ou GIF."
        : "Choisissez un fichier JPG, PNG, WebP, GIF ou PDF.",
    );
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}
async function saveForm(form) {
  const d = new FormData(form),
    type = form.dataset.form,
    id = form.dataset.id,
    now = new Date().toISOString();
  let ops = [],
    x,
    record;
  const v = getVehicle();
  if (type !== "vehicle" && !v) throw new Error("Ajoutez d’abord un véhicule.");
  if (type === "vehicle") {
    x = recordById("vehicles", id) || {};
    const odometer = asNumber(d, "odometer"),
      year = asNumber(d, "year", { optional: true });
    let photo = x.photo || "";
    const file = d.get("photo");
    if (d.has("removePhoto")) photo = "";
    if (file?.size) photo = await readAttachment(file, true);
    record = {
      ...x,
      id: x.id || uid(),
      brand: text(d, "brand", true),
      model: text(d, "model", true),
      version: text(d, "version"),
      year,
      plate: text(d, "plate").toUpperCase(),
      ...encodeFuel(text(d, "fuel", true), text(d, "fuelCustom")),
      initialKm: x.id ? (x.initialKm ?? odometer) : odometer,
      odometer,
      vin: text(d, "vin"),
      notes: text(d, "notes"),
      photo,
      createdAt: x.createdAt || now,
      updatedAt: now,
    };
    if (state.demo) {
      const suggestions = rememberVehicle(currentSuggestions(), record.brand, record.model);
      const active = { ...(state.records.settings.find((item) => item.id === "activeVehicle") || {}), id: "activeVehicle", value: record.id };
      applyToMemory([put("vehicles", record), put("settings", active), put("settings", suggestions)]);
    } else {
      const { suggestions, active } = await state.db.saveVehicleWithSuggestions(record);
      applyToMemory([put("vehicles", record), put("settings", active), put("settings", suggestions)]);
    }
    state.activeId = record.id;
  } else if (type === "trip") {
    x = recordById("trips", id) || {};
    if (id && !x.id) throw new Error("Ce trajet n’existe plus.");
    const profile = text(d, "profile", true);
    if (!Object.hasOwn(TRIP_PROFILES, profile)) throw new Error("Type de trajet invalide.");
    const durationMin = asNumber(d, "durationMin", { optional: true, min: 1 });
    if (durationMin !== null && !Number.isInteger(durationMin)) throw new Error("La durée doit être un nombre entier de minutes.");
    record = {
      ...x, id: x.id || uid(), vehicleId: x.vehicleId || v.id, status: "complete", method: x.method === "gps" ? "gps" : "manual",
      date: dateValue(d, "date", true), startedAt: x.startedAt || null,
      title: text(d, "title"), from: text(d, "from"), to: text(d, "to"),
      distanceKm: asNumber(d, "distanceKm", { min: 0.01 }), durationMin,
      profile, notes: text(d, "notes"), createdAt: x.createdAt || now, updatedAt: now,
    };
    await apply([put("trips", record)]);
  } else if (type === "service") {
    x = recordById("services", id) || {};
    record = {
      ...x,
      id: x.id || uid(),
      vehicleId: x.vehicleId || v.id,
      title: text(d, "title", true),
      category: text(d, "category"),
      date: dateValue(d, "date", true),
      odometer: asNumber(d, "odometer"),
      place: text(d, "place"),
      parts: asNumber(d, "parts"),
      labor: asNumber(d, "labor"),
      notes: text(d, "notes"),
      createdAt: x.createdAt || now,
      updatedAt: now,
    };
    ops.push(put("services", record));
    const dueDate = dateValue(d, "reminderDate"),
      dueKm = asNumber(d, "reminderKm", { optional: true });
    if (!x.id && (dueDate || dueKm !== null))
      ops.push(
        put("reminders", {
          id: uid(),
          vehicleId: v.id,
          title: `Prochain : ${record.title}`,
          category: "entretien",
          dueDate: dueDate || null,
          dueKm,
          warnDays: 30,
          warnKm: 500,
          repeatDays: 0,
          repeatKm: 0,
          active: true,
          createdAt: now,
          updatedAt: now,
        }),
      );
    const op = odometerOperation(v.id, record.odometer);
    if (op) ops.push(op);
    await apply(ops);
  } else if (type === "fill") {
    x = recordById("fills", id) || {};
    record = {
      ...x,
      id: x.id || uid(),
      vehicleId: x.vehicleId || v.id,
      date: dateValue(d, "date", true),
      odometer: asNumber(d, "odometer"),
      volume: asNumber(d, "volume", { min: 0.01 }),
      unitPrice: asNumber(d, "unitPrice", { optional: true }),
      total: asNumber(d, "total"),
      full: d.has("full"),
      unit: x.unit || carUnit(),
      station: text(d, "station"),
      notes: text(d, "notes"),
      createdAt: x.createdAt || now,
      updatedAt: now,
    };
    ops.push(put("fills", record));
    const op = odometerOperation(v.id, record.odometer);
    if (op) ops.push(op);
    await apply(ops);
  } else if (type === "expense") {
    x = recordById("expenses", id) || {};
    record = {
      ...x,
      id: x.id || uid(),
      vehicleId: x.vehicleId || v.id,
      title: text(d, "title", true),
      category: text(d, "category"),
      date: dateValue(d, "date", true),
      amount: asNumber(d, "amount"),
      notes: text(d, "notes"),
      createdAt: x.createdAt || now,
      updatedAt: now,
    };
    await apply([put("expenses", record)]);
  } else if (type === "reminder") {
    x = recordById("reminders", id) || {};
    const dueDate = dateValue(d, "dueDate"),
      dueKm = asNumber(d, "dueKm", { optional: true });
    if (!dueDate && dueKm === null)
      throw new Error("Indiquez une date ou un kilométrage d’échéance.");
    record = {
      ...x,
      id: x.id || uid(),
      vehicleId: x.vehicleId || v.id,
      title: text(d, "title", true),
      category: text(d, "category"),
      dueDate: dueDate || null,
      dueKm,
      warnDays: asNumber(d, "warnDays"),
      warnKm: asNumber(d, "warnKm"),
      repeatDays: asNumber(d, "repeatDays", { optional: true }) || 0,
      repeatKm: asNumber(d, "repeatKm", { optional: true }) || 0,
      active: d.has("active"),
      createdAt: x.createdAt || now,
      updatedAt: now,
    };
    await apply([put("reminders", record)]);
  } else if (type === "symptom") {
    x = recordById("symptoms", id) || {};
    record = {
      ...x,
      id: x.id || uid(),
      vehicleId: x.vehicleId || v.id,
      title: text(d, "title", true),
      category: text(d, "category"),
      severity: text(d, "severity"),
      status: text(d, "status"),
      date: dateValue(d, "date", true),
      odometer: asNumber(d, "odometer"),
      description: text(d, "description"),
      createdAt: x.createdAt || now,
      updatedAt: now,
    };
    ops.push(put("symptoms", record));
    const op = odometerOperation(v.id, record.odometer);
    if (op) ops.push(op);
    await apply(ops);
  } else if (type === "template") {
    x = recordById("templates", id) || {};
    const lines = text(d, "items", true)
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!lines.length || lines.length > 30)
      throw new Error("La liste doit contenir entre 1 et 30 points.");
    record = {
      ...x,
      id: x.id || uid(),
      name: text(d, "name", true),
      description: text(d, "description"),
      items: lines.map((title, i) => ({
        id: x.items?.[i]?.id || uid(),
        title,
      })),
      createdAt: x.createdAt || now,
      updatedAt: now,
    };
    await apply([put("templates", record)]);
  } else if (type === "check") {
    const t = recordById("templates", id);
    if (!t) throw new Error("Cette liste n’existe plus.");
    const results = t.items.map((item, i) => ({
      itemId: item.id,
      title: item.title,
      status: text(d, `result-${i}`, true),
      note: text(d, `note-${i}`),
    }));
    record = {
      id: uid(),
      vehicleId: v.id,
      templateId: t.id,
      templateName: t.name,
      date: dateValue(d, "date", true),
      odometer: asNumber(d, "odometer"),
      results,
      status: results.some((r) => r.status === "nok") ? "attention" : "ok",
      createdAt: now,
      updatedAt: now,
    };
    ops.push(put("checks", record));
    const op = odometerOperation(v.id, record.odometer);
    if (op) ops.push(op);
    await apply(ops);
  } else if (type === "document") {
    const file = d.get("file"),
      dataUrl = await readAttachment(file);
    record = {
      id: uid(),
      vehicleId: v.id,
      title: text(d, "title", true),
      category: text(d, "category"),
      date: dateValue(d, "date", true),
      filename: file.name,
      type: file.type,
      size: file.size,
      dataUrl,
      createdAt: now,
      updatedAt: now,
    };
    await apply([put("documents", record)]);
  }
  modal.close();
  render();
  demoToast();
}
async function deleteVehicle(id) {
  const v = recordById("vehicles", id);
  if (!v) return;
  if (!confirm(`Supprimer ${nameOf(v)} et toutes ses données (trajets, pleins, dépenses, rappels, documents, etc.) ? Cette action est irréversible.`)) return;
  const stores = ["services", "fills", "trips", "expenses", "reminders", "symptoms", "checks", "documents"];
  const wasActive = state.activeId === id;
  let next = state.records.vehicles.find((x) => x.id !== id)?.id || null;
  if (state.demo) {
    const ops = [del("vehicles", id), ...stores.flatMap((s) => state.records[s].filter((x) => x.vehicleId === id).map((x) => del(s, x.id)))];
    if (wasActive) ops.push(put("settings", { ...(state.records.settings.find((x) => x.id === "activeVehicle") || {}), id: "activeVehicle", value: next }));
    await apply(ops);
  } else {
    // Garder un GPS actif s'il concerne un autre véhicule dans cet onglet.
    // Dans tous les autres cas, bloquer un éventuel suivi GPS d'une autre fenêtre.
    const ownTrip = gps.tripId ? recordById("trips", gps.tripId) : null;
    const ownOtherGps = gps.watchId !== null && ownTrip?.vehicleId !== id;
    if (!ownOtherGps) await quiesceGps();
    try {
      const fresh = await state.db.readAll();
      next = fresh.vehicles.find((x) => x.id !== id)?.id || null;
      await state.db.deleteVehicleCascade(id, { activeId: next, wasActive });
      state.records = await state.db.readAll();
    } finally { if (!ownOtherGps) await endGpsMutation(); }
  }
  if (wasActive) state.activeId = next;
  render();
  toast(state.demo ? "Véhicule d’exemple supprimé pour cet aperçu." : "Véhicule et données associées supprimés.");
}
async function deleteItem(store, id, label) {
  const x = recordById(store, id);
  if (!x) return;
  if (!confirm(`Supprimer ${label} ? Cette action est irréversible.`)) return;
  const deletingGps = store === "trips" && x.status === "running" && x.method === "gps" && !state.demo;
  if (deletingGps) await quiesceGps();
  try { await apply([del(store, id)]); }
  finally { if (deletingGps) await endGpsMutation(); }
  render();
  toast(state.demo ? "Supprimé dans l’aperçu." : "Élément supprimé.");
}
async function completeReminder(id) {
  const x = recordById("reminders", id),
    v = getVehicle();
  if (!x || !v) return;
  const repeats =
    (Number(x.repeatDays) || 0) > 0 || (Number(x.repeatKm) || 0) > 0;
  if (
    !confirm(
      repeats
        ? "Marquer ce rappel comme fait ? La prochaine échéance sera recalculée depuis aujourd’hui et le kilométrage actuel."
        : "Marquer ce rappel comme terminé ?",
    )
  )
    return;
  const updated = {
    ...x,
    active: repeats,
    updatedAt: new Date().toISOString(),
  };
  if (repeats) {
    updated.dueDate = x.repeatDays
      ? addDays(today(), Number(x.repeatDays))
      : null;
    updated.dueKm = x.repeatKm ? Number(v.odometer) + Number(x.repeatKm) : null;
  }
  await apply([put("reminders", updated)]);
  render();
  demoToast();
}
function makeDownload(blob, filename) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function exportBackup() {
  if (state.demo) {
    toast(
      "Commencez avec votre véhicule pour sauvegarder de vraies données.",
      true,
    );
    return;
  }
  // Inclure les points déjà traités, puis lire un instantané cohérent de la base.
  await gps.queue;
  const data = await state.db.readAll();
  const backup = {
    app: "VigieAuto",
    formatVersion: 3,
    exportedAt: new Date().toISOString(),
    data,
  };
  makeDownload(
    new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
    `vigieauto-sauvegarde-${today()}.json`,
  );
  toast("Sauvegarde téléchargée. Conservez-la dans un endroit sûr.");
}
function validateBackup(obj) {
  const legacy = ["CQ Auto", "VigieAuto"].includes(obj?.app) && obj?.formatVersion === 1;
  const v2 = obj?.app === "VigieAuto" && obj?.formatVersion === 2;
  const v3 = obj?.app === "VigieAuto" && obj?.formatVersion === 3;
  if ((!legacy && !v2 && !v3) || !obj.data || typeof obj.data !== "object" || Array.isArray(obj.data))
    throw new Error("Ce fichier n’est pas une sauvegarde VigieAuto compatible.");
  // Les sauvegardes CQ Auto v1 n’avaient pas de collection de trajets.
  const data = { ...obj.data, ...(legacy ? { trips: [] } : {}) }, ids = {};
  for (const name of STORES) {
    if (!Array.isArray(data[name]))
      throw new Error(`Collection manquante : ${name}.`);
    ids[name] = new Set();
    for (const x of data[name]) {
      if (
        !x ||
        typeof x !== "object" ||
        Array.isArray(x) ||
        typeof x.id !== "string" ||
        !x.id ||
        ids[name].has(x.id)
      )
        throw new Error(`Données invalides dans ${name}.`);
      ids[name].add(x.id);
    }
  }
  const isText = (x) => typeof x === "string";
  const isNum = (x) => typeof x === "number" && Number.isFinite(x) && x >= 0;
  const optNum = (x) => x === null || x === undefined || isNum(x);
  const optDate = (x) =>
    x === null || x === undefined || x === "" || validDate(x);
  // Vérifier également les champs optionnels utilisés pour le tri ou l'affichage.
  const textFields = {
    vehicles: [
      "brand",
      "model",
      "version",
      "plate",
      "fuel",
      "fuelDetail",
      "vin",
      "notes",
      "photo",
    ],
    services: ["title", "category", "date", "place", "notes"],
    fills: ["date", "unit", "station", "notes"],
    trips: ["date", "status", "method", "startedAt", "title", "from", "to", "profile", "notes"],
    expenses: ["title", "category", "date", "notes"],
    reminders: ["title", "category", "dueDate"],
    symptoms: [
      "title",
      "category",
      "severity",
      "status",
      "date",
      "description",
    ],
    templates: ["name", "description"],
    checks: ["templateId", "templateName", "date", "status"],
    documents: ["title", "category", "date", "filename", "type", "dataUrl"],
    settings: [],
  };
  for (const name of STORES)
    for (const x of data[name]) {
      for (const key of [...textFields[name], "createdAt", "updatedAt"]) {
        if (x[key] !== undefined && x[key] !== null && !isText(x[key]))
          throw new Error(`Champ ${key} invalide dans ${name}.`);
      }
    }
  for (const x of data.vehicles)
    if (
      !isText(x.brand) ||
      !isText(x.model) ||
      !isNum(x.odometer) ||
      !optNum(x.year) ||
      !optNum(x.initialKm) ||
      (x.photo && !validPhoto(x.photo))
    )
      throw new Error("Véhicule invalide dans la sauvegarde.");
  for (const s of [
    "services",
    "fills",
    "expenses",
    "reminders",
    "symptoms",
    "checks",
    "documents",
    "trips",
  ])
    for (const x of data[s])
      if (!isText(x.vehicleId) || !ids.vehicles.has(x.vehicleId))
        throw new Error("Une donnée est associée à un véhicule absent.");
  for (const x of data.services)
    if (
      !isText(x.title) ||
      !validDate(x.date) ||
      !isNum(x.odometer) ||
      !isNum(x.parts) ||
      !isNum(x.labor)
    )
      throw new Error("Intervention invalide dans la sauvegarde.");
  for (const x of data.fills)
    if (
      !validDate(x.date) ||
      !isNum(x.odometer) ||
      !isNum(x.volume) ||
      x.volume === 0 ||
      !isNum(x.total) ||
      !optNum(x.unitPrice) ||
      !["L", "kWh"].includes(x.unit) ||
      typeof x.full !== "boolean"
    )
      throw new Error("Plein invalide dans la sauvegarde.");
  const gpsTripFields = new Set(["id", "vehicleId", "date", "status", "method", "startedAt", "title", "from", "to", "distanceKm", "durationMin", "profile", "notes", "createdAt", "updatedAt", "gpsDistanceM", "gpsHasFix", "gpsInterrupted"]);
  for (const x of data.trips) {
    const startedValid = x.startedAt === null || x.startedAt === undefined ||
      (isText(x.startedAt) && Number.isFinite(Date.parse(x.startedAt)));
    const gpsTrip = x.method === "gps";
    const gpsValid = !gpsTrip || (v3 && !!x.startedAt && isNum(x.gpsDistanceM) &&
      typeof x.gpsHasFix === "boolean" && typeof x.gpsInterrupted === "boolean" &&
      Object.keys(x).every((key) => gpsTripFields.has(key)));
    const minDistance = v2 ? 0.1 : 0.01;
    if (!validDate(x.date) || !["running", "complete"].includes(x.status) ||
        !["manual", "gps"].includes(x.method) || !gpsValid ||
        !Object.hasOwn(TRIP_PROFILES, x.profile) || !startedValid ||
        (x.status === "running" && (!x.startedAt || x.distanceKm !== null || x.durationMin !== null)) ||
        (x.status === "complete" && (!isNum(x.distanceKm) || x.distanceKm < minDistance ||
          !(x.durationMin === null || (isNum(x.durationMin) && Number.isInteger(x.durationMin) && x.durationMin >= 1)))))
      throw new Error("Trajet invalide dans la sauvegarde.");
  }
  for (const x of data.expenses)
    if (!isText(x.title) || !validDate(x.date) || !isNum(x.amount))
      throw new Error("Dépense invalide dans la sauvegarde.");
  for (const x of data.reminders)
    if (
      !isText(x.title) ||
      !optDate(x.dueDate) ||
      !optNum(x.dueKm) ||
      !optNum(x.warnDays) ||
      !optNum(x.warnKm) ||
      !optNum(x.repeatDays) ||
      !optNum(x.repeatKm) ||
      typeof x.active !== "boolean"
    )
      throw new Error("Rappel invalide dans la sauvegarde.");
  for (const x of data.symptoms)
    if (!isText(x.title) || !validDate(x.date) || !isNum(x.odometer))
      throw new Error("Symptôme invalide dans la sauvegarde.");
  for (const x of data.templates)
    if (
      !isText(x.name) ||
      !Array.isArray(x.items) ||
      !x.items.length ||
      x.items.length > 30 ||
      x.items.some((i) => !i || !isText(i.id) || !isText(i.title))
    )
      throw new Error("Liste de contrôle invalide dans la sauvegarde.");
  for (const x of data.checks)
    if (
      !isText(x.templateName) ||
      !validDate(x.date) ||
      !isNum(x.odometer) ||
      !Array.isArray(x.results) ||
      x.results.some(
        (r) =>
          !r ||
          !isText(r.title) ||
          !["ok", "nok", "na"].includes(r.status) ||
          (r.note != null && !isText(r.note)),
      )
    )
      throw new Error("Contrôle invalide dans la sauvegarde.");
  for (const x of data.documents)
    if (
      !isText(x.title) ||
      !isText(x.filename) ||
      !validDate(x.date) ||
      !isNum(x.size) ||
      !validDocument(x.dataUrl)
    )
      throw new Error("Document invalide dans la sauvegarde.");
  const theme = data.settings.find((x) => x.id === "theme");
  if (theme && !VALID_THEMES.has(theme.value)) throw new Error("Thème invalide dans la sauvegarde.");
  const suggestions = data.settings.find((x) => x.id === SUGGESTION_SETTING_ID);
  if (suggestions) validateSuggestionSetting(suggestions);
  return data;
}
async function importBackup(file) {
  if (!file) return;
  if (
    file.size > 100 * 1024 * 1024 &&
    !confirm(
      "Ce fichier est volumineux et son import peut être lent. Continuer ?",
    )
  )
    return;
  let data;
  try {
    data = validateBackup(JSON.parse(await file.text()));
  } catch (error) {
    throw new Error(
      error instanceof SyntaxError
        ? "Le fichier JSON est illisible."
        : error.message,
    );
  }
  if (
    !confirm(
      `Importer ${data.vehicles.length} véhicule(s) ? Toutes les données VigieAuto de cet appareil seront remplacées. Cette opération est irréversible.`,
    )
  )
    return;
  await quiesceGps();
  try {
    // Une restauration interrompt forcément la continuité du GPS en cours.
    data.trips = data.trips.map((x) => x.method === "gps" && x.status === "running" ? { ...x, gpsInterrupted: true } : x);
    await state.db.replaceAll(data);
    state.records = await state.db.readAll();
  } finally { await endGpsMutation(); }
  state.demo = false;
  state.themePreference = storedTheme(state.records);
  applyTheme();
  const saved = state.records.settings.find(
    (x) => x.id === "activeVehicle",
  )?.value;
  state.activeId =
    state.records.vehicles.find((x) => x.id === saved)?.id ||
    state.records.vehicles[0]?.id ||
    null;
  render();
  toast("Sauvegarde importée avec succès.");
}
async function resetAll() {
  if (state.demo) {
    if (!confirm("Quitter le mode découverte et repartir d’un carnet vide ?"))
      return;
    await leaveDemo();
    state.activeId = null;
    go("accueil");
    toast("Le carnet est prêt pour votre véhicule.");
    return;
  }
  if (
    !confirm(
      "Effacer tous les véhicules, documents et données de cet appareil ? Vérifiez d’abord que vous disposez d’une sauvegarde.",
    )
  )
    return;
  if (
    !confirm(
      "Dernière confirmation : cette suppression est définitive. Continuer ?",
    )
  )
    return;
  const records = Object.fromEntries(STORES.map((s) => [s, []]));
  records.templates = structuredClone(DEFAULT_TEMPLATES);
  records.settings = [{ id: "defaultsSeeded", value: true }];
  await quiesceGps();
  try {
    await state.db.replaceAll(records);
    state.records = records;
  } finally { await endGpsMutation(); }
  state.activeId = null;
  state.themePreference = "auto";
  applyTheme();
  go("accueil");
  toast("Données locales supprimées.");
}
function mustHaveVehicle() {
  if (!getVehicle()) {
    toast("Ajoutez d’abord un véhicule.", true);
    return false;
  }
  return true;
}
function describeError(error) {
  if (error?.name === "QuotaExceededError")
    return "Espace de stockage insuffisant. Exportez vos données et libérez de la place sur l’appareil.";
  return error?.message || "Une erreur est survenue. Réessayez.";
}
modal.addEventListener("close", () => {
  if (!gps.finishTripId) return;
  const id = gps.finishTripId;
  gps.finishTripId = null;
  gps.transition = true;
  void (async () => {
    const trip = recordById("trips", id);
    if (trip?.status === "running" && trip.method === "gps") {
      gps.phase = "paused";
      gps.message = "GPS arrêté après fermeture du formulaire. Reprenez à l’arrêt pour poursuivre.";
      await queueGpsUpdate(id, { interrupted: true });
    }
    await releaseGpsLock();
  })().catch((error) => { console.error(error); toast(describeError(error), true); })
    .finally(() => { gps.transition = false; if (state.records) render(); });
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") {
    if (gps.tripId && gps.watchId !== null && !gps.transition) {
      const id = gps.tripId, canResume = gps.permissionConfirmed;
      gps.pauseTask = pauseGps(id, {
        interrupted: true,
        autoResume: canResume,
        message: "Application masquée : GPS en pause, distance potentiellement incomplète.",
      }).catch((error) => { console.error(error); gps.autoResume = false; });
    }
    return;
  }
  void (async () => {
    if (gps.pauseTask) await gps.pauseTask;
    gps.pauseTask = null;
    const id = gps.tripId;
    if (gps.autoResume && id && recordById("trips", id)?.status === "running") {
      gps.autoResume = false;
      await beginGps(id);
    }
  })().catch((error) => { console.error(error); toast(describeError(error), true); });
});
window.addEventListener("pagehide", () => {
  if (gps.tripId && gps.watchId !== null && !gps.transition) {
    gps.pauseTask = pauseGps(gps.tripId, {
      interrupted: true, autoResume: false,
      message: "Application fermée : GPS arrêté. Reprenez à l’arrêt après ouverture.",
    }).catch((error) => { console.error(error); });
  }
});
document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-route],[data-action]");
  if (!target) return;
  const route = target.dataset.route,
    action = target.dataset.action,
    id = target.dataset.id;
  try {
    if (route) {
      go(route);
      return;
    }
    switch (action) {
      case "close-modal":
        modal.close();
        break;
      case "use-clio-example": {
        const form = target.closest('form[data-form="vehicle"]');
        if (form) {
          form.elements.brand.value = "Renault";
          updateVehicleOptions(form, { brandChanged: true });
          form.elements.model.value = "Clio";
          form.elements.year.value = "2008";
          form.elements.version.value = "1.5 dCi 68";
          form.elements.fuel.value = "diesel";
          updateVehicleOptions(form);
          form.elements.odometer.focus();
        }
        break;
      }
      case "free-brand":
      case "free-model": {
        const form = target.closest('form[data-form="vehicle"]');
        if (form) {
          const input = form.elements[action === "free-brand" ? "brand" : "model"];
          if (!input.disabled) {
            input.value = "";
            updateVehicleOptions(form, { brandChanged: action === "free-brand" });
            input.focus();
          }
        }
        break;
      }
      case "quick-menu":
        quickMenu();
        break;
      case "start-real":
        await leaveDemo();
        vehicleForm();
        break;
      case "add-vehicle":
        if (state.demo) await leaveDemo();
        vehicleForm();
        break;
      case "edit-vehicle":
        vehicleForm(id);
        break;
      case "select-vehicle":
        await chooseVehicle(id);
        toast("Véhicule sélectionné.");
        break;
      case "delete-vehicle":
        await deleteVehicle(id);
        break;
      case "start-trip":
        if (mustHaveVehicle()) await startTrip();
        break;
      case "prepare-gps":
        if (mustHaveVehicle()) gpsIntro();
        break;
      case "activate-gps": {
        if (!mustHaveVehicle()) break;
        if (!window.isSecureContext || !navigator.geolocation?.watchPosition)
          throw new Error("GPS indisponible : utilisez une adresse HTTPS et un navigateur compatible, ou le mode manuel.");
        const trip = await startTrip("gps");
        if (trip) {
          modal.close();
          gps.permissionConfirmed = false;
          await beginGps(trip.id, { freshStart: true });
        }
        break;
      }
      case "pause-gps":
        await pauseGps(id);
        break;
      case "resume-gps":
        await beginGps(id);
        break;
      case "add-trip":
        if (mustHaveVehicle()) tripForm();
        break;
      case "finish-trip": {
        if (!mustHaveVehicle()) break;
        const trip = recordById("trips", id);
        if (trip?.status === "running" && trip.method === "gps") await finishGpsTrip(id);
        else tripForm(id);
        break;
      }
      case "edit-trip":
        if (mustHaveVehicle()) tripForm(id);
        break;
      case "delete-trip":
        await deleteItem("trips", id, "ce trajet");
        break;
      case "add-service":
        if (mustHaveVehicle()) serviceForm();
        break;
      case "edit-service":
        if (mustHaveVehicle()) serviceForm(id);
        break;
      case "delete-service":
        await deleteItem("services", id, "cette intervention");
        break;
      case "add-fill":
        if (mustHaveVehicle()) fillForm();
        break;
      case "edit-fill":
        if (mustHaveVehicle()) fillForm(id);
        break;
      case "delete-fill":
        await deleteItem("fills", id, "ce plein");
        break;
      case "add-expense":
        if (mustHaveVehicle()) expenseForm();
        break;
      case "edit-expense":
        if (mustHaveVehicle()) expenseForm(id);
        break;
      case "delete-expense":
        await deleteItem("expenses", id, "cette dépense");
        break;
      case "add-reminder":
        if (mustHaveVehicle()) reminderForm();
        break;
      case "edit-reminder":
        if (mustHaveVehicle()) reminderForm(id);
        break;
      case "delete-reminder":
        await deleteItem("reminders", id, "ce rappel");
        break;
      case "done-reminder":
        await completeReminder(id);
        break;
      case "go-checks":
        go("controles");
        break;
      case "add-template":
        if (mustHaveVehicle()) templateForm();
        break;
      case "edit-template":
        if (mustHaveVehicle()) templateForm(id);
        break;
      case "delete-template":
        await deleteItem(
          "templates",
          id,
          "cette liste (les contrôles déjà réalisés seront conservés)",
        );
        break;
      case "run-check":
        if (mustHaveVehicle()) checkForm(id);
        break;
      case "view-check":
        showCheck(id);
        break;
      case "delete-check":
        await deleteItem("checks", id, "ce contrôle");
        break;
      case "add-symptom":
        if (mustHaveVehicle()) symptomForm();
        break;
      case "edit-symptom":
        if (mustHaveVehicle()) symptomForm(id);
        break;
      case "delete-symptom":
        await deleteItem("symptoms", id, "ce symptôme");
        break;
      case "resolve-symptom": {
        const x = recordById("symptoms", id);
        if (x) {
          await apply([
            put("symptoms", {
              ...x,
              status: "resolu",
              updatedAt: new Date().toISOString(),
            }),
          ]);
          render();
          demoToast();
        }
        break;
      }
      case "add-document":
        if (mustHaveVehicle()) documentForm();
        break;
      case "download-document": {
        const x = recordById("documents", id);
        if (x && validDocument(x.dataUrl)) {
          const blob = await (await fetch(x.dataUrl)).blob();
          makeDownload(blob, x.filename || "document");
        }
        break;
      }
      case "delete-document":
        await deleteItem("documents", id, "ce document");
        break;
      case "export":
        await exportBackup();
        break;
      case "import":
        $("#import-file").click();
        break;
      case "reset-all":
        await resetAll();
        break;
      case "install":
        if (state.installPrompt) {
          await state.installPrompt.prompt();
          state.installPrompt = null;
          render();
        }
        break;
    }
  } catch (error) {
    console.error(error);
    toast(describeError(error), true);
  }
});
document.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  const button = form.querySelector("[type=submit]"),
    errorBox = form.querySelector(".form-error");
  button.disabled = true;
  errorBox.classList.remove("visible");
  try {
    await saveForm(form);
  } catch (error) {
    console.error(error);
    errorBox.textContent = describeError(error);
    errorBox.classList.add("visible");
    errorBox.scrollIntoView({ block: "nearest" });
  } finally {
    button.disabled = false;
  }
});
document.addEventListener("input", (event) => {
  const vehicleFormElement = event.target.closest('form[data-form="vehicle"]');
  if (vehicleFormElement && ["brand", "model"].includes(event.target.name)) {
    updateVehicleOptions(vehicleFormElement, { brandChanged: event.target.name === "brand" });
    return;
  }
  const form = event.target.closest('form[data-form="fill"]');
  if (!form) return;
  const total = form.elements.total;
  if (event.target.name === "total") total.dataset.manual = "true";
  if (
    ["volume", "unitPrice"].includes(event.target.name) &&
    !total.dataset.manual
  ) {
    const volume = Number(form.elements.volume.value),
      price = Number(form.elements.unitPrice.value);
    if (
      form.elements.volume.value &&
      form.elements.unitPrice.value &&
      Number.isFinite(volume * price)
    )
      total.value = (volume * price).toFixed(2);
  }
});
document.addEventListener("change", async (event) => {
  const vehicleFormElement = event.target.closest('form[data-form="vehicle"]');
  if (vehicleFormElement) {
    const target = event.target;
    if (["brand", "model", "fuel"].includes(target.name)) updateVehicleOptions(vehicleFormElement, { brandChanged: target.name === "brand" });
  }
  if (event.target.dataset.setting === "theme") {
    try { await setThemePreference(event.target.value); }
    catch (error) { console.error(error); toast(describeError(error), true); render(); }
    return;
  }
  if (event.target.dataset.filter === "trips") {
    state.tripFilter = event.target.value;
    render();
    return;
  }
  if (event.target.dataset.filter === "services") {
    state.serviceFilter = event.target.value;
    render();
  }
});
$("#import-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  try {
    await importBackup(file);
  } catch (error) {
    console.error(error);
    toast(describeError(error), true);
  }
});
window.addEventListener("hashchange", () => {
  state.route = location.hash.slice(1) || "accueil";
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
});
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  state.installPrompt = event;
  if (state.route === "parametres") render();
});
window.addEventListener("appinstalled", () => {
  state.installPrompt = null;
  toast("VigieAuto est installée.");
});

if (darkScheme) {
  const onSchemeChange = () => applyTheme();
  if (darkScheme.addEventListener) darkScheme.addEventListener("change", onSchemeChange);
  else darkScheme.addListener?.(onSchemeChange);
}

async function start() {
  try {
    // Le fichier est inclus au cache de la PWA. Si le fichier manque, la saisie libre reste possible.
    try {
      const response = await fetch(new URL("../data/brands_models_fr.json", import.meta.url));
      if (!response.ok) throw new Error("Référentiel indisponible");
      const catalogue = await response.json();
      if (catalogue.version !== 1 || !Array.isArray(catalogue.brands) || !Array.isArray(catalogue.fuels)) throw new Error("Référentiel invalide");
      state.catalogue = catalogue;
    } catch (error) { console.warn("Suggestions prédéfinies indisponibles ; la saisie libre reste possible.", error); }
    state.db = await new LocalDatabase().open();
    let records = await state.db.readAll();
    if (!records.settings.some((x) => x.id === "defaultsSeeded")) {
      const operations = [
        put("settings", { id: "defaultsSeeded", value: true }),
      ];
      if (!records.templates.length)
        operations.push(
          ...DEFAULT_TEMPLATES.map((x) => put("templates", structuredClone(x))),
        );
      await state.db.apply(operations);
      records = await state.db.readAll();
    }
    // Une nouvelle page ne possède plus le dernier point GPS ; ne pas reprendre
    // silencieusement ni relier les positions avant/après rechargement.
    const restoredGps = records.trips.filter((x) => x.status === "running" && x.method === "gps");
    if (restoredGps.length && await acquireGpsLock()) {
      try {
        for (const trip of restoredGps) await state.db.updateGpsTrip(trip.id, { interrupted: true });
        records = await state.db.readAll();
      } finally { await releaseGpsLock(); }
    }
    state.themePreference = storedTheme(records);
    applyTheme();
    if (!records.vehicles.length) {
      state.demo = true;
      state.records = demoRecords();
      state.activeId = "demo-clio";
    } else {
      state.records = records;
      const saved = records.settings.find(
        (x) => x.id === "activeVehicle",
      )?.value;
      state.activeId =
        records.vehicles.find((x) => x.id === saved)?.id ||
        records.vehicles[0].id;
    }
    state.route = location.hash.slice(1) || "accueil";
    render();
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register("./sw.js")
        .catch((error) =>
          console.warn("Service worker non disponible :", error),
        );
  } catch (error) {
    console.error(error);
    app.innerHTML = `<div class="fatal"><div><span class="loading-mark">!</span><h1 style="margin:20px 0 10px">Impossible d’ouvrir VigieAuto</h1><p>Le stockage local est inaccessible. Vérifiez les paramètres de votre navigateur puis réessayez.</p><p style="margin-top:8px;font-size:12px">${esc(describeError(error))}</p><button class="btn" style="margin-top:20px" onclick="location.reload()">Réessayer</button></div></div>`;
  }
}
start();
