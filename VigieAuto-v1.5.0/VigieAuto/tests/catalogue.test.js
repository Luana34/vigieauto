import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { brandSuggestions, modelSuggestions, normalise, rememberVehicle, validateSuggestionSetting, encodeFuel, fuelChoice, fuelLabel, FUEL_CHOICES } from "../js/catalogue.js";
const catalog = JSON.parse(await readFile(new URL("../data/brands_models_fr.json", import.meta.url), "utf8"));

test("référentiel FR court, priorités demandées et énergie partagée", () => {
  assert.equal(catalog.version, 1); assert.equal(catalog.brands.length, 48);
  assert.deepEqual(catalog.brands.slice(0, 4).map((b) => b.name), ["Renault", "Peugeot", "Citroën", "Dacia"]);
  assert.equal(catalog.brands.at(-1).name, "Datsun");
  assert.ok(catalog.brands.every((b) => b.models.length >= 5));
  assert.deepEqual(catalog.fuels, Object.values(FUEL_CHOICES));
  assert.ok(catalog.brands.find((b) => b.name === "Renault").models.includes("Clio"));
});
test("recherche sans accents et modèles strictement liés à la marque", () => {
  assert.equal(normalise(" ŠKODA  "), "skoda");
  assert.deepEqual(brandSuggestions(catalog, null, "ren"), ["Renault"]);
  assert.ok(brandSuggestions(catalog, null, "skoda").includes("Škoda"));
  assert.ok(modelSuggestions(catalog, null, "Renault", "megane").includes("Mégane"));
  assert.ok(!modelSuggestions(catalog, null, "Peugeot", "Clio").length);
  assert.deepEqual(modelSuggestions(catalog, null, "", ""), []);
});
test("texte libre mémorisé, sans doublon de casse/accent et avec champs additionnels conservés", () => {
  const initial = {id:"vehicleSuggestions", version:1, brands:[], models:[], extra:null};
  let a = rememberVehicle(initial, " Fabrique Libre ", " Modèle Étoile ");
  a.models[0].extra = { conserve:true };
  a = rememberVehicle(a, "fabrique libre", "Modele Etoile");
  assert.equal(a.brands.length, 1); assert.equal(a.models.length, 1);
  assert.deepEqual(a.models[0].extra, {conserve:true}); assert.equal(a.extra, null);
  assert.equal(a.lastBrand, "fabrique libre"); assert.equal(a.lastModel, "Modele Etoile");
  assert.ok(brandSuggestions(catalog, a, "fabrique").includes("Fabrique Libre"));
  assert.ok(modelSuggestions(catalog, a, "FABRIQUE LIBRE", "etoile").includes("Modèle Étoile"));
  assert.deepEqual(modelSuggestions(catalog, a, "Autre", "etoile"), []);
  assert.equal(rememberVehicle(null, "Autre marque…", "Autre modèle…").lastBrand, "Autre marque…");
});
test("suggestions de structure inconnue refusées avant toute mutation", () => {
  const invalid = {id:"vehicleSuggestions", version:2, brands:["X"], models:[]};
  assert.throws(() => validateSuggestionSetting(invalid));
  assert.throws(() => rememberVehicle(invalid, "X", "Y"));
  assert.deepEqual(invalid.brands, ["X"]);
});
test("hybride rechargeable et énergie libre sans casser les codes historiques", () => {
  const h = encodeFuel("hybride_rechargeable");
  assert.deepEqual(h, {fuel:"hybride", fuelDetail:"Hybride rechargeable"});
  assert.equal(fuelChoice(h), "hybride_rechargeable"); assert.equal(fuelLabel(h), "Hybride rechargeable");
  const custom = encodeFuel("autre", "  Bioéthanol  ");
  assert.deepEqual(custom, {fuel:"autre", fuelDetail:"Bioéthanol"}); assert.equal(fuelLabel(custom), "Bioéthanol");
  assert.equal(fuelLabel({fuel:"diesel", fuelDetail:"Bioéthanol"}), "Diesel"); // ancienne PWA ayant modifié fuel
  assert.equal(fuelLabel({fuel:"hybride", fuelDetail:"Bioéthanol"}), "Hybride");
  assert.throws(() => encodeFuel("interdite"));
});
