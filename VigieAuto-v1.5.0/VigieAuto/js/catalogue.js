// Référentiel commun Android / PWA : les choix ne sont jamais une contrainte.
export const SUGGESTION_SETTING_ID = "vehicleSuggestions";
export const AUTRE_MARQUE = "Autre marque…";
export const AUTRE_MODELE = "Autre modèle…";

export function normalise(value) {
  return String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ");
}
const uniq = (values) => {
  const seen = new Set();
  return values.filter((value) => {
    if (typeof value !== "string" || !value.trim()) return false;
    const key = normalise(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function validateSuggestionSetting(value) {
  if (!value || value.id !== SUGGESTION_SETTING_ID || value.version !== 1 ||
      !Array.isArray(value.brands) || value.brands.some((b) => typeof b !== "string" || !b.trim()) ||
      !Array.isArray(value.models) || value.models.some((m) => !m || typeof m !== "object" || Array.isArray(m) ||
        typeof m.brand !== "string" || !m.brand.trim() || typeof m.model !== "string" || !m.model.trim()) ||
      !(value.lastBrand == null || typeof value.lastBrand === "string") ||
      !(value.lastModel == null || typeof value.lastModel === "string")) {
    throw new Error("Suggestions de véhicules incompatibles : sauvegarde non modifiée.");
  }
  return value;
}

export function rememberVehicle(previous, brand, model) {
  const cleanBrand = String(brand ?? "").trim(), cleanModel = String(model ?? "").trim();
  if (!cleanBrand || !cleanModel) throw new Error("Saisissez une marque et un modèle.");
  const base = previous ? validateSuggestionSetting(previous) : { id: SUGGESTION_SETTING_ID, version: 1, brands: [], models: [] };
  const brands = [...base.brands], models = [...base.models];
  if (!brands.some((b) => normalise(b) === normalise(cleanBrand))) brands.push(cleanBrand);
  if (!models.some((m) => normalise(m.brand) === normalise(cleanBrand) && normalise(m.model) === normalise(cleanModel)))
    models.push({ brand: cleanBrand, model: cleanModel });
  // Les propriétés inconnues et les entrées existantes sont gardées telles quelles.
  return { ...base, brands, models, lastBrand: cleanBrand, lastModel: cleanModel };
}

export function brandSuggestions(catalogue, setting, query = "") {
  const personal = setting ? validateSuggestionSetting(setting).brands : [];
  const names = [...(catalogue?.brands || []).map((entry) => entry.name), ...personal];
  const term = normalise(query);
  return uniq(names).filter((name) => normalise(name).includes(term));
}

export function modelSuggestions(catalogue, setting, brand, query = "") {
  const key = normalise(brand);
  if (!key) return [];
  const predefined = (catalogue?.brands || []).find((entry) => normalise(entry.name) === key)?.models || [];
  const personal = setting ? validateSuggestionSetting(setting).models.filter((m) => normalise(m.brand) === key).map((m) => m.model) : [];
  const term = normalise(query);
  return uniq([...predefined, ...personal]).filter((name) => normalise(name).includes(term));
}

// Les anciens exports utilisent des codes d'énergie. Le détail conserve l'étiquette
// nouvelle ou libre sans casser les anciennes sauvegardes ni le calcul en litres.
export const FUEL_CHOICES = {
  diesel: "Diesel", essence: "Essence", hybride: "Hybride",
  hybride_rechargeable: "Hybride rechargeable", electrique: "Électrique", gpl: "GPL", autre: "Autre",
};
export function fuelChoice(vehicle = {}) {
  if (vehicle.fuel === "hybride" && vehicle.fuelDetail === "Hybride rechargeable") return "hybride_rechargeable";
  return Object.hasOwn(FUEL_CHOICES, vehicle.fuel) ? vehicle.fuel : "autre";
}
export function encodeFuel(choice, custom = "") {
  if (!Object.hasOwn(FUEL_CHOICES, choice)) throw new Error("Énergie invalide.");
  if (choice === "hybride_rechargeable") return { fuel: "hybride", fuelDetail: "Hybride rechargeable" };
  return { fuel: choice, fuelDetail: choice === "autre" ? String(custom).trim() : "" };
}
export function fuelLabel(vehicle = {}) {
  const detail = typeof vehicle.fuelDetail === "string" ? vehicle.fuelDetail.trim() : "";
  // Une ancienne PWA peut modifier fuel en conservant un détail inconnu devenu obsolète.
  if (vehicle.fuel === "autre" && detail) return detail;
  if (vehicle.fuel === "hybride" && detail === "Hybride rechargeable") return detail;
  return FUEL_CHOICES[vehicle.fuel] || vehicle.fuel || "—";
}
