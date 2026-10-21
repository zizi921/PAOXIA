// Relative offsets are local only. Saved records contain a unit-square outline.
const MAX_POINTS = 512;
const MAX_SEGMENTS = 32;
function createRouteTrace(saved) {
  let segments = saved && Array.isArray(saved.segments) ? saved.segments.slice(0, MAX_SEGMENTS).map(s =>
    Array.isArray(s) ? s.filter(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)).map(p => p.slice()) : []) : [];
  let partial = !!(saved && saved.partial);
  let origin = null;
  const tail = segments.length && segments[segments.length - 1];
  const offset = tail && tail.length ? tail[tail.length - 1].slice() : [0, 0];
  let segment = null;
  function compact() {
    while (segments.reduce((n, s) => n + s.length, 0) > MAX_POINTS) {
      segments = segments.map(s => s.filter((p, i) => i === 0 || i === s.length - 1 || i % 2 === 0));
      segment = segments[segments.length - 1];
    }
  }
  compact();
  segment = null; // A restored process has no geographic anchor: begin a separate piece.
  return {
    add(point, newSegment) {
      if (!point || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return;
      if (!origin) origin = { latitude: point.latitude, longitude: point.longitude };
      if (newSegment || !segment) {
        if (segments.length >= MAX_SEGMENTS) { partial = true; segment = null; return; }
        segment = []; segments.push(segment);
      }
      const rad = Math.PI / 180;
      const dLon = ((point.longitude - origin.longitude + 540) % 360) - 180;
      segment.push([
        Math.round((offset[0] + dLon * rad * 6371000 * Math.cos(origin.latitude * rad)) * 10) / 10,
        Math.round((offset[1] - (point.latitude - origin.latitude) * rad * 6371000) * 10) / 10
      ]);
      compact();
    },
    snapshot() { return { segments: segments.map(s => s.map(p => p.slice())), partial }; }
  };
}
function normalizeRoute(trace, incomplete) {
  const segments = trace && trace.segments ? trace.segments.filter(s => s.length >= 2) : [];
  if (!segments.length) return undefined;
  const points = [].concat(...segments);
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY);
  if (!span) return undefined;
  const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
  return { version: 1, partial: !!incomplete || !!trace.partial,
    segments: segments.map(s => s.map(p => [p[0] - centerX, p[1] - centerY].map(v => Math.round((0.5 + v / span * 0.84) * 1000) / 1000))) };
}
module.exports = { createRouteTrace, normalizeRoute };
