import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  dayDiff,
  today,
  fillIntervals,
  averageEnergyCostPerKm,
  reminderInfo,
  spending,
} from "../js/calc.js";

const fill = (
  id,
  date,
  odometer,
  volume,
  full,
  unit = "L",
  total = volume,
) => ({ id, date, odometer, volume, full, unit, total, createdAt: date });

test("additionne les pleins partiels entre deux pleins complets", () => {
  const data = [
    fill("a", "2026-01-01", 1000, 40, true),
    fill("b", "2026-01-02", 1200, 10, false),
    fill("c", "2026-01-03", 1500, 20, true),
  ];
  const result = fillIntervals(data, "L");
  assert.equal(result.byId.a, undefined);
  assert.equal(result.byId.b, undefined);
  assert.equal(result.byId.c.distance, 500);
  assert.equal(result.byId.c.volume, 30);
  assert.equal(result.byId.c.consumption, 6);
  assert.equal(result.average, 6);
});

test("la moyenne est pondérée par la distance", () => {
  const data = [
    fill("a", "2026-01-01", 1000, 10, true),
    fill("b", "2026-01-02", 1100, 10, true),
    fill("c", "2026-01-03", 2000, 45, true),
  ];
  assert.equal(fillIntervals(data, "L").average, 5.5);
});

test("ignore un intervalle incohérent puis repart au plein complet suivant", () => {
  const data = [
    fill("a", "2026-01-01", 1000, 40, true),
    fill("b", "2026-01-02", 950, 10, false),
    fill("c", "2026-01-03", 1500, 20, true),
    fill("d", "2026-01-04", 2000, 30, true),
  ];
  const result = fillIntervals(data, "L");
  assert.equal(result.byId.c, undefined);
  assert.equal(result.byId.d.consumption, 6);
});

test("ne mélange pas les litres et les kWh", () => {
  const data = [
    fill("a", "2026-01-01", 1000, 40, true),
    fill("b", "2026-01-02", 1500, 25, true),
    fill("c", "2026-01-03", 1800, 40, true, "kWh"),
    fill("d", "2026-01-04", 2000, 30, true, "kWh"),
  ];
  assert.equal(fillIntervals(data, "L").average, 5);
  assert.equal(fillIntervals(data, "kWh").average, 15);
});

test("gère les dates calendaires sans décalage horaire", () => {
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(dayDiff("2026-11-01", "2026-10-31"), 1);
});

test("alerte si une des deux échéances est proche ou dépassée", () => {
  const vehicle = { odometer: 1000 };
  assert.equal(
    reminderInfo(
      {
        dueDate: addDays(today(), 500),
        dueKm: 1200,
        warnDays: 30,
        warnKm: 500,
      },
      vehicle,
    ).status,
    "soon",
  );
  assert.equal(
    reminderInfo(
      { dueDate: null, dueKm: 999, warnDays: 30, warnKm: 500 },
      vehicle,
    ).status,
    "overdue",
  );
});

test("additionne uniquement les coûts enregistrés", () => {
  assert.deepEqual(
    spending({
      fills: [{ total: 50 }],
      services: [{ parts: 20, labor: 30 }],
      expenses: [{ amount: 10 }],
    }),
    { fuel: 50, service: 50, other: 10, total: 110 },
  );
});


test("coût énergétique pondéré au km sur les pleins valides", () => {
  const data = [
    fill("a", "2026-01-01", 1000, 40, true, "L", 60),
    fill("b", "2026-01-02", 1500, 30, true, "L", 45),
    fill("c", "2026-01-03", 1700, 10, false, "L", 15),
    fill("d", "2026-01-04", 2000, 20, true, "L", 30),
  ];
  assert.equal(averageEnergyCostPerKm(data, "L"), 0.09);
  assert.equal(averageEnergyCostPerKm(data.slice(0, 1), "L"), null);
  assert.equal(averageEnergyCostPerKm(data, "kWh"), null);
});

test("coût de recharge distinct du coût en litres, sans diviser par zéro", () => {
  const data = [
    fill("a", "2026-01-01", 1000, 20, true, "kWh", 4),
    fill("b", "2026-01-02", 1200, 30, true, "kWh", 9),
    fill("c", "2026-01-03", 1200, 10, true, "kWh", 2),
  ];
  assert.equal(averageEnergyCostPerKm(data, "kWh"), 9 / 200);
  assert.equal(averageEnergyCostPerKm([], "kWh"), null);
});
