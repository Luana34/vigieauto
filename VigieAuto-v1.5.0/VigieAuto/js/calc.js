// Fonctions pures de calcul et de formatage.
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function addDays(value, n) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "";
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + Number(n)));
  return date.toISOString().slice(0, 10);
}
export function dayDiff(to, from = today()) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(to || "") ||
    !/^\d{4}-\d{2}-\d{2}$/.test(from || "")
  )
    return null;
  const utc = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(to) - utc(from)) / 86400000);
}
export const number = (v, digits = 0) =>
  Number.isFinite(Number(v))
    ? new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(Number(v))
    : "—";
export const money = (v) => `${number(v, 2)} €`;
export const shortDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value || "")) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
export function prettyDate(
  value,
  opts = { day: "numeric", month: "long", year: "numeric" },
) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value || "")) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", opts).format(new Date(y, m - 1, d));
}
export function fillIntervals(fills, targetUnit = null) {
  // Deux pleins complets délimitent un intervalle ; les pleins partiels intercalés y contribuent.
  // En cas de changement d'énergie, ne jamais additionner des litres et des kWh.
  const ordered = [...fills].sort(
    (a, b) =>
      (a.date || "").localeCompare(b.date || "") ||
      Number(a.odometer || 0) - Number(b.odometer || 0) ||
      (a.createdAt || "").localeCompare(b.createdAt || ""),
  );
  const byId = Object.create(null);
  let anchor = null,
    litres = 0,
    cost = 0,
    lastKm = null,
    invalid = false;
  for (const f of ordered) {
    const km = Number(f.odometer),
      volume = Number(f.volume),
      amount = Number(f.total);
    const valid =
      Number.isFinite(km) &&
      km >= 0 &&
      Number.isFinite(volume) &&
      volume > 0 &&
      Number.isFinite(amount) &&
      amount >= 0;
    if (!anchor) {
      if (f.full && valid) {
        anchor = f;
        lastKm = km;
      }
      continue;
    }
    if (!valid || km < lastKm || (f.unit || "L") !== (anchor.unit || "L"))
      invalid = true;
    if (valid) {
      litres += volume;
      cost += amount;
      lastKm = km;
    }
    if (f.full) {
      const distance = km - Number(anchor.odometer);
      if (!invalid && distance > 0)
        byId[f.id] = {
          distance,
          volume: litres,
          cost,
          consumption: (litres * 100) / distance,
          costPerKm: cost / distance,
          unit: f.unit || "L",
        };
      anchor = valid ? f : null;
      lastKm = valid ? km : null;
      litres = 0;
      cost = 0;
      invalid = false;
    }
  }
  const intervals = Object.values(byId).filter(
    (x) => !targetUnit || x.unit === targetUnit,
  );
  const distance = intervals.reduce((s, x) => s + x.distance, 0);
  const volume = intervals.reduce((s, x) => s + x.volume, 0);
  return {
    byId,
    intervals,
    distance,
    volume,
    average: distance ? (volume * 100) / distance : null,
  };
}
// Coût énergétique moyen au km sur les seuls intervalles de pleins complets valides.
// Les litres et kWh ne sont jamais mélangés ; ce n’est pas une mesure par trajet.
export function averageEnergyCostPerKm(fills, unit) {
  const summary = fillIntervals(fills, unit);
  if (!summary.distance) return null;
  return summary.intervals.reduce((total, interval) => total + interval.cost, 0) / summary.distance;
}
export function reminderInfo(r, vehicle) {
  const days = r.dueDate ? dayDiff(r.dueDate) : null;
  const km =
    r.dueKm !== null && r.dueKm !== undefined && r.dueKm !== "" && vehicle
      ? Number(r.dueKm) - Number(vehicle.odometer || 0)
      : null;
  const wd = Number.isFinite(Number(r.warnDays)) ? Number(r.warnDays) : 30;
  const wk = Number.isFinite(Number(r.warnKm)) ? Number(r.warnKm) : 500;
  const overdue = (days !== null && days < 0) || (km !== null && km < 0);
  const soon = (days !== null && days <= wd) || (km !== null && km <= wk);
  const parts = [];
  if (days !== null)
    parts.push(
      days < 0
        ? `${number(Math.abs(days))} j de retard`
        : days === 0
          ? "Aujourd’hui"
          : `dans ${number(days)} j`,
    );
  if (km !== null)
    parts.push(
      km < 0
        ? `${number(Math.abs(km))} km de retard`
        : km === 0
          ? "au kilométrage prévu"
          : `dans ${number(km)} km`,
    );
  return {
    days,
    km,
    overdue,
    soon,
    status: overdue ? "overdue" : soon ? "soon" : "ok",
    label: parts.join(" · ") || "Sans échéance",
  };
}
export function spending(records) {
  const fuel = records.fills.reduce((s, x) => s + (Number(x.total) || 0), 0);
  const service = records.services.reduce(
    (s, x) => s + (Number(x.parts) || 0) + (Number(x.labor) || 0),
    0,
  );
  const other = records.expenses.reduce(
    (s, x) => s + (Number(x.amount) || 0),
    0,
  );
  return { fuel, service, other, total: fuel + service + other };
}
export function monthlySpending(records, count = 6) {
  const base = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(
      base.getFullYear(),
      base.getMonth() - (count - 1 - i),
      1,
    );
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const starts = (x) => (x.date || "").startsWith(key);
    const amounts = spending({
      fills: records.fills.filter(starts),
      services: records.services.filter(starts),
      expenses: records.expenses.filter(starts),
    });
    return {
      key,
      label: new Intl.DateTimeFormat("fr-FR", { month: "short" })
        .format(d)
        .replace(".", ""),
      ...amounts,
    };
  });
}
