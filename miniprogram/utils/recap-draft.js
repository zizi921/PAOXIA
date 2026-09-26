const { readRecords } = require('./records');
const STORAGE_KEY = 'paoxia.recapDraft';

function readDraft() {
  const draft = wx.getStorageSync(STORAGE_KEY);
  if (draft === '' || draft === undefined || draft === null) return null;
  if (typeof draft.id !== 'string' || !Number.isFinite(draft.durationSeconds) ||
      draft.durationSeconds < 0 || typeof draft.weather !== 'string' ||
      typeof draft.mood !== 'string' || typeof draft.distance !== 'string' ||
      typeof draft.note !== 'string' || !draft.selectedNotices ||
      typeof draft.selectedNotices !== 'object' || Array.isArray(draft.selectedNotices)) {
    throw new Error('Invalid recap draft');
  }
  // A completed record remains authoritative if draft removal failed.
  return readRecords().some(record => record.id === draft.id) ? null : draft;
}

function saveDraft(draft) {
  wx.setStorageSync(STORAGE_KEY, draft);
}

function clearDraft() {
  wx.removeStorageSync(STORAGE_KEY);
}

module.exports = { readDraft, saveDraft, clearDraft };
