import test from "node:test";
import assert from "node:assert/strict";
import { consumeGpsFix, haversineMeters } from "../js/gps.js";

const position = (latitude, longitude, accuracy, timestamp) => ({ coords: { latitude, longitude, accuracy }, timestamp });
const at = 1_800_000_000_000;
const step = (state, latitude, longitude, accuracy, ts) => consumeGpsFix(state, position(latitude, longitude, accuracy, ts), ts);

test("GPS : la formule de distance est symétrique et franchit le changement de méridien", () => {
  const a = {lat:0, lon:179.999}, b = {lat:0, lon:-179.999};
  const distance = haversineMeters(a, b);
  assert.ok(distance > 220 && distance < 225);
  assert.equal(distance, haversineMeters(b, a));
  assert.equal(haversineMeters(a, a), 0);
});

test("GPS : premier point sans distance, mouvement cohérent ensuite", () => {
  const first = step(null, 43.34, 3.21, 5, at);
  assert.equal(first.reason, "first"); assert.equal(first.addedM, 0);
  const next = step(first.state, 43.341, 3.21, 5, at + 10000);
  assert.equal(next.reason, "move"); assert.ok(next.addedM > 110 && next.addedM < 112);
  assert.equal(next.interrupted, false);
});

test("GPS : les petits écarts ne sont pas additionnés mais le mouvement cumulé est conservé", () => {
  let current = step(null, 0, 0, 5, at);
  current = step(current.state, 0, 0.00002, 5, at + 1000);
  assert.equal(current.reason, "noise"); assert.equal(current.addedM, 0);
  current = step(current.state, 0, 0.00005, 5, at + 2000);
  assert.equal(current.reason, "noise");
  current = step(current.state, 0, 0.00009, 5, at + 3000);
  assert.equal(current.reason, "move"); assert.ok(current.addedM > 9 && current.addedM < 11);
});

test("GPS : le stationnement avec des points réguliers ne devient pas une interruption", () => {
  let current = step(null, 0, 0, 5, at);
  for (let n = 1; n <= 5; n++) current = step(current.state, 0, 0, 5, at + n * 30000);
  current = step(current.state, 0, 0.0001, 5, at + 180000);
  assert.equal(current.reason, "move"); assert.equal(current.interrupted, false);
});

test("GPS : les coupures longues et les sauts impossibles ne créent pas de distance", () => {
  let current = step(null, 0, 0, 5, at);
  current = step(current.state, 0, 0.01, 5, at + 61000);
  assert.equal(current.reason, "gap"); assert.equal(current.addedM, 0); assert.equal(current.interrupted, true);
  current = step(current.state, 0, 0.1, 5, at + 62000);
  assert.equal(current.reason, "jump"); assert.equal(current.addedM, 0); assert.equal(current.interrupted, true);
});

test("GPS : positions imprécises, anciennes, incohérentes ou en double sont ignorées", () => {
  const first = step(null, 0, 0, 5, at);
  for (const bad of [
    position(0, 0.001, 51, at + 1000), position(91, 0, 5, at + 1000),
    position(0, 181, 5, at + 1000), position(0, 0.001, -1, at + 1000),
    position(0, 0.001, 5, at), position(NaN, 0, 5, at + 1000),
  ]) {
    const result = consumeGpsFix(first.state, bad, at + 1000);
    assert.equal(result.addedM, 0); assert.deepEqual(result.state, first.state);
  }
  const stale = consumeGpsFix(first.state, position(0, 0.001, 5, at + 1000), at + 50000);
  assert.equal(stale.reason, "stale");
});
