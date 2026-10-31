// Stockage local. Les écritures groupées ne sont confirmées qu'à la fin de la transaction.
import { SUGGESTION_SETTING_ID, rememberVehicle } from "./catalogue.js";
export const STORES = [
  "vehicles",
  "services",
  "fills",
  "trips",
  "expenses",
  "reminders",
  "symptoms",
  "templates",
  "checks",
  "documents",
  "settings",
];
const DB_NAME = "cq-auto-local";
// Conserver ce nom : c’est la même base que CQ Auto sur la même origine.
const DB_VERSION = 2;

export class LocalDatabase {
  constructor() {
    this.db = null;
  }
  async open() {
    if (!("indexedDB" in window))
      throw new Error("IndexedDB est indisponible dans ce navigateur.");
    this.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath: "id" });
            if (!["vehicles", "templates", "settings"].includes(name))
              store.createIndex("vehicleId", "vehicleId", { unique: false });
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () =>
        reject(req.error || new Error("Ouverture du stockage impossible."));
      req.onblocked = () =>
        reject(
          new Error("Fermez les autres onglets VigieAuto avant de réessayer."),
        );
    });
    this.db.onversionchange = () => this.db.close();
    return this;
  }
  async readAll() {
    return new Promise((resolve, reject) => {
      const result = {};
      const tx = this.db.transaction(STORES, "readonly");
      for (const name of STORES) {
        const request = tx.objectStore(name).getAll();
        request.onsuccess = () => {
          result[name] = request.result;
        };
      }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error("Lecture impossible."));
      tx.onabort = () => reject(tx.error || new Error("Lecture annulée."));
    });
  }
  async apply(operations) {
    if (!operations.length) return;
    return new Promise((resolve, reject) => {
      let tx;
      try {
        const stores = [...new Set(operations.map((op) => op.store))];
        if (stores.some((name) => !STORES.includes(name)))
          throw new Error("Collection inconnue.");
        tx = this.db.transaction(stores, "readwrite");
        for (const op of operations) {
          const store = tx.objectStore(op.store);
          if (op.type === "put") store.put(op.value);
          else if (op.type === "delete") store.delete(op.id);
          else if (op.type === "clear") store.clear();
          else throw new Error("Opération inconnue.");
        }
      } catch (error) {
        if (tx) tx.abort();
        reject(error);
        return;
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Écriture impossible."));
      tx.onabort = () => reject(tx.error || new Error("Transaction annulée."));
    });
  }
  async saveVehicleWithSuggestions(vehicle) {
    // Lire et fusionner la liste courante dans la même transaction que le véhicule :
    // deux onglets ne peuvent pas écraser silencieusement leurs suggestions respectives.
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["vehicles", "settings"], "readwrite");
      const settings = tx.objectStore("settings"), vehicles = tx.objectStore("vehicles");
      let reason, updatedSuggestions, updatedActive;
      const suggestionRequest = settings.get(SUGGESTION_SETTING_ID);
      suggestionRequest.onsuccess = () => {
        try {
          updatedSuggestions = rememberVehicle(suggestionRequest.result, vehicle.brand, vehicle.model);
          settings.put(updatedSuggestions);
          vehicles.put(vehicle);
        } catch (error) { reason = error; tx.abort(); }
      };
      const activeRequest = settings.get("activeVehicle");
      activeRequest.onsuccess = () => {
        updatedActive = { ...(activeRequest.result || {}), id: "activeVehicle", value: vehicle.id };
        settings.put(updatedActive);
      };
      tx.oncomplete = () => resolve({ suggestions: updatedSuggestions, active: updatedActive });
      tx.onerror = () => reject(reason || tx.error || new Error("Enregistrement du véhicule impossible."));
      tx.onabort = () => reject(reason || tx.error || new Error("Enregistrement du véhicule annulé."));
    });
  }
  async chooseVehicle(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["vehicles", "settings"], "readwrite");
      const settings = tx.objectStore("settings");
      let active, reason;
      const vehicle = tx.objectStore("vehicles").get(id);
      vehicle.onsuccess = () => {
        if (!vehicle.result) { reason = new Error("Ce véhicule n’existe plus."); tx.abort(); return; }
        const current = settings.get("activeVehicle");
        current.onsuccess = () => {
          active = { ...(current.result || {}), id: "activeVehicle", value: id };
          settings.put(active);
        };
      };
      tx.oncomplete = () => resolve(active);
      tx.onerror = () => reject(reason || tx.error || new Error("Sélection du véhicule impossible."));
      tx.onabort = () => reject(reason || tx.error || new Error("Sélection du véhicule annulée."));
    });
  }
  async getTrip(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("trips", "readonly");
      const req = tx.objectStore("trips").get(id);
      let result;
      req.onsuccess = () => { result = req.result || null; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error("Lecture du trajet impossible."));
      tx.onabort = () => reject(tx.error || new Error("Lecture du trajet annulée."));
    });
  }
  async startTrip(record) {
    // La vérification et l'ajout partagent une transaction, y compris entre onglets.
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["trips", "vehicles"], "readwrite");
      const store = tx.objectStore("trips");
      let reason;
      const req = store.getAll();
      req.onsuccess = () => {
        if (req.result.some((x) => x.status === "running")) {
          reason = new Error("Un trajet est déjà en cours dans VigieAuto. Terminez-le ou annulez-le avant d’en démarrer un autre.");
          reason.code = "TRIP_ALREADY_RUNNING";
          tx.abort();
          return;
        }
        const vehicle = tx.objectStore("vehicles").get(record.vehicleId);
        vehicle.onsuccess = () => {
          if (!vehicle.result) {
            reason = new Error("Le véhicule a été supprimé dans une autre fenêtre. Rechargez VigieAuto.");
            tx.abort();
          } else store.add(record);
        };
      };
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(reason || tx.error || new Error("Démarrage du trajet impossible."));
      tx.onabort = () => reject(reason || tx.error || new Error("Démarrage du trajet annulé."));
    });
  }
  async updateGpsTrip(id, { addedM = 0, hasFix = false, interrupted = false } = {}) {
    // Modifier le total sur la valeur courante en base, jamais à partir d'une copie d'onglet.
    // Un trajet supprimé ou terminé dans un autre onglet ne doit pas être recréé.
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("trips", "readwrite");
      const store = tx.objectStore("trips"), req = store.get(id);
      let result = null, reason;
      req.onsuccess = () => {
        const trip = req.result;
        if (!trip || trip.status !== "running" || trip.method !== "gps") return;
        if (!Number.isFinite(trip.gpsDistanceM) || trip.gpsDistanceM < 0 ||
            !Number.isFinite(addedM) || addedM < 0) {
          reason = new Error("Distance GPS locale invalide.");
          tx.abort();
          return;
        }
        result = {
          ...trip,
          gpsDistanceM: trip.gpsDistanceM + addedM,
          gpsHasFix: trip.gpsHasFix || hasFix,
          gpsInterrupted: trip.gpsInterrupted || interrupted,
          updatedAt: new Date().toISOString(),
        };
        store.put(result);
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(reason || tx.error || new Error("Enregistrement GPS impossible."));
      tx.onabort = () => reject(reason || tx.error || new Error("Enregistrement GPS annulé."));
    });
  }
  async deleteVehicleCascade(id, { activeId = null, wasActive = false } = {}) {
    // L'index véhicule est lu dans la même transaction que sa suppression :
    // une donnée créée dans un autre onglet ne reste pas orpheline.
    const related = ["services", "fills", "trips", "expenses", "reminders", "symptoms", "checks", "documents"];
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["vehicles", "settings", ...related], "readwrite");
      tx.objectStore("vehicles").delete(id);
      if (wasActive) {
        const settings = tx.objectStore("settings"), current = settings.get("activeVehicle");
        current.onsuccess = () => settings.put({ ...(current.result || {}), id: "activeVehicle", value: activeId });
      }
      for (const name of related) {
        const store = tx.objectStore(name);
        const req = store.index("vehicleId").openKeyCursor(IDBKeyRange.only(id));
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) { store.delete(cursor.primaryKey); cursor.continue(); }
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Suppression du véhicule impossible."));
      tx.onabort = () => reject(tx.error || new Error("Suppression du véhicule annulée."));
    });
  }
  async replaceAll(records) {
    const operations = [];
    for (const name of STORES) {
      operations.push({ store: name, type: "clear" });
      for (const value of records[name])
        operations.push({ store: name, type: "put", value });
    }
    await this.apply(operations);
  }
}
