// Estimation locale de distance : les coordonnées ne sortent jamais de cet état en mémoire.
// Aucun point, itinéraire, vitesse ou précision GPS n'est enregistré dans la base.
export const GPS_LIMITS = Object.freeze({
  maxAccuracyM: 50,
  maxAgeMs: 30000,
  maxGapMs: 60000,
  maxSpeedMps: 70, // environ 252 km/h : filtre de saut, pas une mesure fiable de vitesse
});

export function haversineMeters(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(Math.max(0, x))));
}

/**
 * Reçoit une position et renvoie un nouvel état éphémère, la distance ajoutée
 * et un motif d'affichage. Les longues coupures et sauts improbables ne sont
 * jamais reliés par une ligne droite ; le mouvement sous le bruit est ignoré.
 */
export function consumeGpsFix(previous, position, now = Date.now()) {
  const coords = position?.coords;
  const lat = coords?.latitude, lon = coords?.longitude;
  const accuracy = coords?.accuracy, ts = position?.timestamp;
  const unchanged = (reason) => ({ state: previous, addedM: 0, reason, interrupted: false });
  if (![lat, lon, accuracy, ts, now].every(Number.isFinite) ||
      lat < -90 || lat > 90 || lon < -180 || lon > 180 || accuracy < 0 ||
      ts > now + 10000) return unchanged("invalid");
  if (now - ts > GPS_LIMITS.maxAgeMs) return unchanged("stale");
  if (accuracy > GPS_LIMITS.maxAccuracyM) return unchanged("inaccurate");
  const fix = { lat, lon, accuracy, ts };
  if (!previous?.anchor)
    return { state: { anchor: fix, lastTs: ts }, addedM: 0, reason: "first", interrupted: false };
  if (ts <= previous.lastTs) return unchanged("stale");
  if (ts - previous.lastTs > GPS_LIMITS.maxGapMs)
    return { state: { anchor: fix, lastTs: ts }, addedM: 0, reason: "gap", interrupted: true };
  const distance = haversineMeters(previous.anchor, fix);
  const seconds = (ts - previous.anchor.ts) / 1000;
  if (seconds <= 0 || distance / seconds > GPS_LIMITS.maxSpeedMps)
    return { state: { anchor: fix, lastTs: ts }, addedM: 0, reason: "jump", interrupted: true };
  const threshold = Math.max(8, Math.min(40, (previous.anchor.accuracy + accuracy) * 0.75));
  if (distance < threshold)
    return { state: { anchor: previous.anchor, lastTs: ts }, addedM: 0, reason: "noise", interrupted: false };
  return { state: { anchor: fix, lastTs: ts }, addedM: distance, reason: "move", interrupted: false };
}
