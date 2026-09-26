const EARTH_RADIUS_METERS = 6371000;

function toRadians(value) {
  return value * Math.PI / 180;
}

function distanceBetween(from, to) {
  if (!from || !to) return 0;
  const lat1 = Number(from.latitude);
  const lon1 = Number(from.longitude);
  const lat2 = Number(to.latitude);
  const lon2 = Number(to.longitude);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return 0;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistanceMeters(value) {
  const meters = Math.max(0, Number(value) || 0);
  return (meters / 1000).toFixed(2);
}

module.exports = { distanceBetween, formatDistanceMeters };
