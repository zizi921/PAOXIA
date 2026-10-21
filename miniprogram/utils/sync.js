const records = require('./records');
const ENV = 'cloud1-d0gdhw9khd6812077';
let task = null;
let initialized = false;
let status = 'pending';
const listeners = new Set();
function emit(value) { status = value; listeners.forEach(fn => fn(value)); }
function subscribe(fn) { listeners.add(fn); fn(status); return () => listeners.delete(fn); }
async function call(data) {
  const response = await wx.cloud.callFunction({ name: 'paoxiaSync', config: { env: ENV }, data });
  if (!response || !response.result) throw new Error('Invalid cloud response');
  return response.result;
}
async function perform() {
  emit('syncing');
  try {
    if (!wx.cloud || !wx.cloud.callFunction) throw new Error('Cloud unavailable');
    if (!initialized) { wx.cloud.init({ env: ENV, traceUser: false }); initialized = true; }
    const identity = await call({ action: 'identity' });
    if (!identity.ok || !identity.owner) throw new Error('Identity unavailable');
    const owner = identity.owner;
    records.bindOwner(owner);
    let conflicts = false;
    // Writes are durable before network access; failed requests are retried next time.
    for (let count = 0; count < 200; count++) {
      const pending = records.readState().pending[0];
      if (!pending) break;
      if (pending.record && pending.record.routeShape && identity.routeShapeVersion !== 1) throw new Error('Route sync requires updated cloud function');
      const result = await call({ action: 'write', ...pending });
      if (result.owner && result.owner !== owner) throw new Error('Account changed');
      if (result.ok) records.acknowledge(owner, pending.operation, result.value);
      else if (result.error === 'CONFLICT') {
        records.resolveConflict(owner, pending.operation, result.value); conflicts = true;
      } else throw new Error(result.error || 'Sync failed');
    }
    let after = '';
    do {
      const result = await call({ action: 'list', after });
      if (!result.ok || result.owner !== owner || !Array.isArray(result.records)) throw new Error('Read failed');
      records.mergeRemote(owner, result.records);
      after = result.next;
    } while (after);
    emit(records.readState().pending.length ? 'pending' : conflicts ? 'conflict' : 'synced');
  } catch (error) {
    // Local saves remain available; the UI never claims an unsuccessful upload succeeded.
    emit('error');
    console.warn('PAOXIA sync failed:', error.message);
  }
}
function sync() {
  if (!task) task = perform().finally(() => { task = null; });
  return task;
}
module.exports = { sync, subscribe };
