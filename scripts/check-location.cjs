const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { metersBetween, createDistanceFilter, createRunLocation } = require('../miniprogram/utils/run-location');
const point = (meters, accuracy = 4) => ({ latitude: meters / 111194.9266, longitude: 0, accuracy });
assert(Math.abs(metersBetween(point(0), point(1000)) - 1000) < 0.01);
const filter = createDistanceFilter();
assert.equal(filter.add(point(0), 1000).meters, 0);
assert.equal(filter.add(point(2), 2000).meters, 0);
assert(Math.abs(filter.add(point(10), 5000).meters - 10) < 0.01);
assert.equal(filter.add(point(1000), 6000).meters, 0); // impossible jump
assert.equal(filter.add(point(20, 100), 10000).meters, 0); // poor accuracy
assert(Math.abs(filter.add(point(20), 10000).meters - 10) < 0.01);
assert.equal(filter.add(point(21), 10000).meters, 0); // duplicate clock
assert.equal(filter.add(point(300), 60000).status, 'gap');
assert(Math.abs(filter.add(point(310), 65000).meters - 10) < 0.01);
filter.reset();
assert.equal(filter.add(point(800), 70000).meters, 0); // pause/resume excludes travel
assert.equal(filter.add({ latitude: NaN, longitude: 0, accuracy: 3 }, 71000).meters, 0);
// Long stationary periods must not relax the speed filter.
for (let t = 72000; t < 172000; t += 1000) filter.add(point(800), t);
assert.equal(filter.add(point(900), 172000).meters, 0);

function fakeWx() {
  const storage = new Map();
  return {
    storage, starts: 0, stops: 0, listener: null,
    getStorageSync: k => storage.has(k) ? JSON.parse(storage.get(k)) : '',
    setStorageSync: (k, v) => storage.set(k, JSON.stringify(v)),
    removeStorageSync: k => storage.delete(k),
    startLocationUpdateBackground(opts) { this.starts++; opts.success(); },
    stopLocationUpdate(opts) { this.stops++; opts.success(); },
    onLocationChange(fn) { this.listener = fn; },
    offLocationChange(fn) { if (this.listener === fn) this.listener = null; },
    onLocationChangeError(fn) { this.error = fn; },
    offLocationChangeError(fn) { if (this.error === fn) this.error = null; },
    showToast() {}, redirectTo(opts) { opts.complete(); }
  };
}
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
async function main() {
  const api = fakeWx(); const statuses = [];
  const tracker = createRunLocation({ onDistance() {}, onStatus: x => statuses.push(x) }, api);
  await tracker.start(); await tracker.start();
  assert.equal(api.starts, 1);
  await tracker.stop(); assert.equal(api.listener, null);
  let authorize;
  api.startLocationUpdateBackground = opts => { api.starts++; authorize = opts; };
  const starting = tracker.start(); await flush();
  const stopping = tracker.stop(); authorize.success(); await starting; await stopping;
  assert.equal(api.listener, null); assert.equal(api.stops, 2); // late permission cannot restart finished run
  api.startLocationUpdateBackground = opts => opts.fail({ errMsg: 'auth deny' });
  await tracker.start(); assert.equal(statuses.at(-1), 'unavailable');
  const missing = createRunLocation({ onDistance() {}, onStatus: x => statuses.push(x) }, {});
  await missing.start(); assert.equal(statuses.at(-1), 'unavailable');

  let now = 100000;
  const wx = fakeWx();
  function moduleAt(name) {
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(`miniprogram/utils/${name}.js`, 'utf8'), {
      module, wx, Date: { now: () => now }, require: () => ({ readRecords: () => [] })
    });
    return module.exports;
  }
  const modules = Object.fromEntries(['route-shape', 'run-location', 'active-run', 'recap-draft', 'i18n', 'time'].map(n => [n, moduleAt(n)]));
  function page() {
    let result;
    vm.runInNewContext(fs.readFileSync('miniprogram/pages/run/run.js', 'utf8'), {
      Page: p => { result = p; }, wx, Date: { now: () => now }, setInterval: () => 1, clearInterval() {},
      require: path => modules[path.split('/').at(-1)] || { safeTop: () => 96, showShareMenu() {} }
    });
    result.setData = data => Object.assign(result.data, data);
    return result;
  }
  let run = page(); run.onLoad({}); run.onShow(); await flush();
  wx.listener(point(0)); now += 5000; wx.listener(point(10));
  assert(Math.abs(run.distanceMeters - 10) < 0.01);
  run.onHide(); now += 5000; wx.listener(point(20)); // background callbacks remain active
  assert(Math.abs(run.distanceMeters - 20) < 0.01);
  run.togglePause(); await flush(); assert.equal(wx.listener, null);
  now += 10000; run.togglePause(); await flush();
  wx.listener(point(500)); now += 5000; wx.listener(point(510));
  assert(Math.abs(run.distanceMeters - 30) < 0.01);
  run.finish(); await flush(); assert.equal(wx.listener, null);
  let draft = wx.getStorageSync('paoxia.recapDraft');
  assert.equal(draft.distance, '0.03');
  assert.equal(wx.getStorageSync('paoxia.activeRun'), '');
  draft.distance = '2.50'; wx.setStorageSync('paoxia.recapDraft', draft);
  now += 20000; run = page(); run.onLoad({ continue: '1' }); run.onShow(); await flush();
  wx.listener(point(1000)); now += 5000; wx.listener(point(1010));
  run.finish(); await flush();
  assert.equal(wx.getStorageSync('paoxia.recapDraft').distance, '2.51'); // manual correction retained
  now += 10000; run = page(); run.onLoad({ continue: '1' }); run.onShow(); await flush();
  now += 31000; run.updateClock();
  assert.equal(run.data.distanceIncomplete, true); // stale GPS is never presented as healthy
  run.onUnload(); await flush();
  now += 10000; run = page(); run.onLoad({});
  assert.equal(run.data.distanceText, '0.04'); assert.equal(run.data.distanceIncomplete, true);
  const persisted = wx.getStorageSync('paoxia.activeRun');
  assert(!('latitude' in persisted)); assert(!('longitude' in persisted));
  run.finish(); await flush();
  assert.equal(wx.getStorageSync('paoxia.recapDraft').run.distanceIncomplete, true);
  console.log('PASS: GPS filtering, jumps, pauses, background callbacks, permission races, denial, recovery, editable recap distance and interrupted signal.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
