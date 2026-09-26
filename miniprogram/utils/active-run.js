const STORAGE_KEY = 'paoxia.activeRun';

function readActiveRun() {
  const run = wx.getStorageSync(STORAGE_KEY);
  if (run === '' || run === undefined || run === null) return null;
  if (!Number.isFinite(run.startedAt) || run.startedAt <= 0 ||
      !Number.isFinite(run.pausedAt) || run.pausedAt < 0 ||
      !Number.isFinite(run.totalPausedMs) || run.totalPausedMs < 0) {
    throw new Error('Invalid active run');
  }
  return run;
}

function saveActiveRun(run) {
  wx.setStorageSync(STORAGE_KEY, {
    startedAt: run.startedAt,
    pausedAt: run.pausedAt,
    totalPausedMs: run.totalPausedMs
  });
}

function clearActiveRun() {
  wx.removeStorageSync(STORAGE_KEY);
}

module.exports = { readActiveRun, saveActiveRun, clearActiveRun };
