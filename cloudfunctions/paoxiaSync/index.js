const cloud = require('wx-server-sdk');
const crypto = require('crypto');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const collection = db.collection('paoxia_runs');
const APPID = 'wx9c65c2f6a3a548d3';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const idOK = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,160}$/.test(value);
function cleanRecord(value) {
  if (!value || !idOK(value.id) || !/^\d{4}-\d{2}-\d{2}$/.test(value.date) ||
      !Number.isFinite(value.durationSeconds) || value.durationSeconds < 0 ||
      typeof value.distance !== 'string' || value.distance.length > 40 ||
      typeof value.note !== 'string' || value.note.length > 10000 ||
      !Array.isArray(value.notices) || value.notices.length > 12 ||
      value.notices.some(n => typeof n !== 'string' || n.length > 30)) throw new Error('INVALID_RECORD');
  const result = {};
  for (const key of ['id', 'date', 'startedAt', 'finishedAt', 'durationSeconds', 'distance', 'weather', 'mood', 'moodType', 'notices', 'note', 'noteDrawing']) {
    if (value[key] !== undefined) result[key] = value[key];
  }
  for (const key of ['weather', 'mood', 'moodType']) {
    if (typeof result[key] !== 'string' || result[key].length > 60) throw new Error('INVALID_RECORD');
  }
  for (const key of ['startedAt', 'finishedAt']) {
    if (result[key] !== undefined && (!Number.isFinite(result[key]) || result[key] < 0)) throw new Error('INVALID_RECORD');
  }
  const strokes = result.noteDrawing || [];
  if (!Array.isArray(strokes) || strokes.length > 120) throw new Error('INVALID_DRAWING');
  let count = 0;
  for (const s of strokes) {
    if (!s || !Array.isArray(s.points) || (s.color && !/^#[0-9a-f]{6}$/i.test(s.color))) throw new Error('INVALID_DRAWING');
    count += s.points.length;
    if (s.points.some(p => !Array.isArray(p) || p.length !== 2 || p.some(n => !Number.isFinite(n) || n < 0 || n > 1))) throw new Error('INVALID_DRAWING');
  }
  if (count > 6000 || Buffer.byteLength(JSON.stringify(result)) > 200000) throw new Error('RECORD_TOO_LARGE');
  return result;
}
function publicDoc(doc) {
  return { id: doc.recordId, revision: doc.revision, deleted: doc.deleted, record: doc.record || null };
}
async function getDoc(id) {
  const found = await collection.where({ _id: id }).limit(1).get();
  return found.data[0];
}
exports.main = async event => {
  const { OPENID, APPID: callerApp } = cloud.getWXContext();
  if (!OPENID || callerApp !== APPID) return { ok: false, error: 'UNAUTHENTICATED' };
  const owner = hash(`${APPID}:${OPENID}`);
  const action = event && event.action;
  if (action === 'identity') return { ok: true, owner };
  if (action === 'list') {
    const after = event.after || '';
    if (typeof after !== 'string' || (after && !/^[a-f0-9]{64}$/.test(after))) return { ok: false, error: 'INVALID_CURSOR' };
    const query = after ? { owner, _id: db.command.gt(after) } : { owner };
    // One drawing can be large; cap each page to keep function responses bounded.
    const result = await collection.where(query).orderBy('_id', 'asc').limit(10).get();
    return { ok: true, owner, records: result.data.map(publicDoc), next: result.data.length === 10 ? result.data[9]._id : '' };
  }
  if (action !== 'write' || !idOK(event.id) || !idOK(event.operation) ||
      !Number.isInteger(event.baseRevision) || event.baseRevision < 0 || typeof event.deleted !== 'boolean') {
    return { ok: false, error: 'INVALID_REQUEST' };
  }
  let record;
  try { record = event.deleted ? null : cleanRecord(event.record); }
  catch (error) { return { ok: false, error: error.message }; }
  if (record && record.id !== event.id) return { ok: false, error: 'INVALID_RECORD' };
  const id = hash(`${owner}:${event.id}`);
  let current = await getDoc(id);
  if (current && current.operation === event.operation) return { ok: true, owner, value: publicDoc(current) };
  // Optimistic concurrency: never silently overwrite another phone's edit.
  if ((current ? current.revision : 0) !== event.baseRevision || (current && current.deleted && !event.deleted)) {
    return { ok: false, error: 'CONFLICT', owner, value: current ? publicDoc(current) : null };
  }
  const value = { owner, recordId: event.id, revision: (current ? current.revision : 0) + 1,
    operation: event.operation, deleted: event.deleted, record, updatedAt: db.serverDate() };
  if (!current) {
    try { await collection.add({ data: { _id: id, ...value } }); }
    catch (error) {
      current = await getDoc(id);
      if (!current) throw error;
      if (current.operation === event.operation) return { ok: true, owner, value: publicDoc(current) };
      return { ok: false, error: 'CONFLICT', owner, value: publicDoc(current) };
    }
  } else {
    const changed = await collection.where({ _id: id, owner, revision: event.baseRevision }).update({ data: value });
    if (changed.stats.updated !== 1) {
      current = await getDoc(id);
      if (current && current.operation === event.operation) return { ok: true, owner, value: publicDoc(current) };
      return { ok: false, error: 'CONFLICT', owner, value: current ? publicDoc(current) : null };
    }
  }
  return { ok: true, owner, value: publicDoc(value) };
};
exports.cleanRecord = cleanRecord;
