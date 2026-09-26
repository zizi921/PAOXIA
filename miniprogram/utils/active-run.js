const STORAGE_KEY = 'paoxia.activeRun';

function readActiveRun() {
  const run = wx.getStorageSync(STORAGE_KEY);
  if (run === '' || run === undefined || run === null) return null;
  if (!Number.isFinite(run.startedAt) || run.startedAt <= 0 ||
      !Number.isFinite(run.pausedAt) || run.pausedAt < 0 ||
      !Number.isFinite(run.totalPausedMs) || run.totalPausedMs < 0) {
    throw new Error('Invalid active run');
  }
  const distanceMeters = Number.isFinite(run.distanceMeters) && run.distanceMeters >= 0
    ? run.distanceMeters : 0;
  const lastLocation = validLocation(run.lastLocation) ? run.lastLocation : null;
  return { ...run, distanceMeters, lastLocation };
}

function validLocation(location) {
  return !location || (Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) && Number.isFinite(location.at) && location.at > 0);
}

function saveActiveRun(run) {
  wx.setStorageSync(STORAGE_KEY, {
    startedAt: run.startedAt,
    pausedAt: run.pausedAt,
    totalPausedMs: run.totalPausedMs,
    distanceMeters: Math.max(0, Number(run.distanceMeters) || 0),
    lastLocation: validLocation(run.lastLocation) ? run.lastLocation : null
  });
}

function clearActiveRun() {
  wx.removeStorageSync(STORAGE_KEY);
}

module.exports = { readActiveRun, saveActiveRun, clearActiveRun };
