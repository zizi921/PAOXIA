const STORAGE_KEY = 'paoxia.completedRuns';
const STATE_KEY = 'paoxia.syncState';
function token() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`; }
function readState() {
  const state = wx.getStorageSync(STATE_KEY);
  if (state) {
    if (state.version !== 1 || !Array.isArray(state.records) || !Array.isArray(state.pending)) throw new Error('Invalid sync state');
    return state;
  }
  const records = wx.getStorageSync(STORAGE_KEY) || [];
  if (!Array.isArray(records)) throw new Error('Invalid completed records');
  return { version: 1, owner: '', records, pending: records.map(record => ({ id: record.id, operation: token(), baseRevision: 0, deleted: false, record })), revisions: {} };
}
function writeState(state) { wx.setStorageSync(STATE_KEY, state); }
function notify() {
  if (typeof getApp === 'function') {
    const app = getApp();
    if (app && app.requestSync) app.requestSync();
  }
}
function readRecords() { return readState().records; }
function queue(state, id, record) {
  // Keep already-queued writes in order; retries always reuse their operation ID.
  state.pending.push({ id, operation: token(), baseRevision: state.revisions[id] || 0, deleted: !record, record: record || null });
}
function saveRecord(record) {
  const state = readState();
  let id = record.id, suffix = 1;
  while (state.records.some(item => item.id === id)) id = `${record.id}-${suffix++}`;
  const value = { ...record, id };
  state.records.unshift(value);
  queue(state, id, value);
  writeState(state); notify();
}
function updateRecord(id, changes) {
  const state = readState();
  const index = state.records.findIndex(record => record.id === id);
  if (index < 0) throw new Error('Record not found');
  const { distance, mood, moodType, notices, note } = changes;
  const previous = state.records[index];
  const value = { ...previous, weather: changes.weather === undefined ? previous.weather : changes.weather,
    distance, mood, moodType, notices, note, noteDrawing: changes.noteDrawing === undefined ? previous.noteDrawing : changes.noteDrawing };
  state.records[index] = value;
  queue(state, id, value);
  writeState(state); notify();
}
function deleteRecord(id) {
  const state = readState();
  if (!state.records.some(record => record.id === id)) throw new Error('Record not found');
  state.records = state.records.filter(record => record.id !== id);
  queue(state, id, null);
  writeState(state); notify();
}
function clearRecords() {
  const state = readState();
  state.records.forEach(record => queue(state, record.id, null));
  state.records = [];
  writeState(state); notify();
}
// Called only after the cloud verifies the current WeChat identity.
function bindOwner(owner) {
  let state = readState();
  if (state.owner && state.owner !== owner) {
    wx.setStorageSync(`${STATE_KEY}.${state.owner}`, state);
    const saved = wx.getStorageSync(`${STATE_KEY}.${owner}`);
    state = saved || { version: 1, records: [], pending: [], revisions: {} };
    // Drafts and active timers must not be carried into another account.
    wx.removeStorageSync('paoxia.activeRun');
    wx.removeStorageSync('paoxia.recapDraft');
  }
  state.owner = owner;
  writeState(state);
  // v1 data was migrated atomically above; never re-import it after cloud deletes.
  wx.removeStorageSync(STORAGE_KEY);
}
function applyValue(state, value) {
  state.revisions[value.id] = value.revision;
  state.records = state.records.filter(r => r.id !== value.id);
  if (!value.deleted && value.record) state.records.push(value.record);
}
function acknowledge(owner, operation, value) {
  const state = readState();
  if (state.owner !== owner) throw new Error('Account changed');
  const index = state.pending.findIndex(op => op.operation === operation);
  if (index < 0) return;
  state.pending.splice(index, 1);
  state.revisions[value.id] = value.revision;
  const next = state.pending.find(op => op.id === value.id);
  if (next) next.baseRevision = value.revision;
  else applyValue(state, value);
  writeState(state);
}
function resolveConflict(owner, operation, value) {
  const state = readState();
  if (state.owner !== owner) throw new Error('Account changed');
  const op = state.pending.find(item => item.operation === operation);
  if (!op) return;
  if (op.deleted) {
    // Delete the version the user intended to remove, including its remote edits.
    op.baseRevision = value ? value.revision : 0;
    op.operation = token();
  } else {
    // Preserve the local edit as a separate record instead of losing either copy.
    const oldId = op.id;
    const id = `copy-${token()}`;
    const related = state.pending.filter(item => item.id === oldId);
    related.forEach(item => {
      item.id = id; item.operation = token(); item.baseRevision = 0;
      if (item.record) item.record = { ...item.record, id };
    });
    const local = state.records.find(r => r.id === oldId);
    if (local) local.id = id;
    if (value) applyValue(state, value);
  }
  writeState(state);
}
function mergeRemote(owner, values) {
  const state = readState();
  if (state.owner !== owner) throw new Error('Account changed');
  for (const value of values) {
    if (!state.pending.some(op => op.id === value.id)) applyValue(state, value);
  }
  state.records.sort((a, b) => b.date.localeCompare(a.date) || (b.finishedAt || 0) - (a.finishedAt || 0) || b.id.localeCompare(a.id));
  writeState(state);
}
module.exports = { readRecords, saveRecord, updateRecord, deleteRecord, clearRecords,
  readState, bindOwner, acknowledge, resolveConflict, mergeRemote };
