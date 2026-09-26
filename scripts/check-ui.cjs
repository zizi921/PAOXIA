const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const time = require('../miniprogram/utils/time');
class TestDate extends Date {
  constructor(...args) { super(...(args.length ? args : [2028, 8, 26, 12])); }
  static now() { return new TestDate().getTime(); }
}
const storage = new Map();
const storageWx = {
  getStorageSync: key => storage.has(key) ? JSON.parse(storage.get(key)) : '',
  setStorageSync: (key, value) => storage.set(key, JSON.stringify(value)),
  removeStorageSync: key => storage.delete(key)
};
function savedRecords() { return storageWx.getStorageSync('paoxia.completedRuns') || []; }
const pages = JSON.parse(fs.readFileSync('miniprogram/app.json')).pages;
for (const route of pages) for (const ext of ['js','json','wxml','wxss']) assert(fs.existsSync(`miniprogram/${route}.${ext}`));
function load(route, wx, globals = {}) {
  let page;
  const runtimeWx = { ...storageWx, ...wx };
  const recordsModule = { exports: {} };
  vm.runInNewContext(fs.readFileSync('miniprogram/utils/records.js', 'utf8'), { module: recordsModule, wx: runtimeWx });
  const activeRunModule = { exports: {} };
  vm.runInNewContext(fs.readFileSync('miniprogram/utils/active-run.js', 'utf8'), { module: activeRunModule, wx: runtimeWx });
  const context = {
    Page: x => page=x,
    wx: runtimeWx,
    Date: TestDate,
    require: request => request.endsWith('/time') ? time : request.endsWith('/records') ? recordsModule.exports : request.endsWith('/active-run') ? activeRunModule.exports : { safeTop: () => 108 },
    ...globals
  };
  vm.runInNewContext(fs.readFileSync(`miniprogram/pages/${route}/${route}.js`, 'utf8'), context);
  page.setData = update => Object.assign(page.data, update);
  return page;
}
let layout;
vm.runInNewContext(fs.readFileSync('miniprogram/utils/layout.js', 'utf8'), { module: layout = { exports: {} }, wx: { getMenuButtonBoundingClientRect: () => ({ bottom: 88 }) } });
assert.equal(layout.exports.safeTop(), 108);
let navigation, completed;
let now = 1000;
const clock = { now: () => now };
const home = load('home', {navigateTo: x => {navigation=x.url;completed=x.complete;}}, { Date: clock });
home.onLoad(); assert.equal(home.data.safeTop, 108);
home.openHistory(); assert.equal(navigation, '/pages/history/history');
navigation=null;home.openHistory();assert.equal(navigation,null);completed();
home.go(); assert.equal(navigation, '/pages/run/run?startedAt=1000');
navigation=null;home.go();assert.equal(navigation,null);completed();home.go();assert.equal(navigation,'/pages/run/run?startedAt=1000');
const emptyHistory = load('history', {reLaunch:x=>{navigation=x.url;}});
emptyHistory.onLoad();emptyHistory.onShow();
assert.equal(emptyHistory.data.records.length,0);
assert.equal(emptyHistory.data.yearRows.length,0);
assert.equal(emptyHistory.data.monthRows.length,0);
assert.equal(emptyHistory.data.selectedRecord,null);
assert.equal(emptyHistory.data.periodLabels.year,'2028');
assert.equal(emptyHistory.data.dayValue,'2028-09-26');
for (const mode of ['year','month','day']) {
  emptyHistory.switchMode({currentTarget:{dataset:{mode}}});
  assert.equal(emptyHistory.data.selectedRecord,null);
}
emptyHistory.goAgain();assert.equal(navigation,'/pages/home/home');
let tick;
const run=load('run',{redirectTo:x=>{navigation=x.url;x.complete();}}, {
  Date: clock,
  setInterval: fn => { tick = fn; return 1; },
  clearInterval: () => {}
});
run.onLoad({startedAt:'1000'});run.onShow();
assert.equal(run.data.elapsedText,'00:00:00');
now=6500;tick();assert.equal(run.data.elapsedText,'00:00:05');
run.togglePause();assert.equal(run.data.paused,true);
now=9500;run.updateClock();assert.equal(run.data.elapsedText,'00:00:05');
run.togglePause();assert.equal(run.data.paused,false);
now=12500;tick();assert.equal(run.data.elapsedText,'00:00:08');
run.finish();assert.equal(navigation,'/pages/recap/recap?durationSeconds=8');
assert.equal(storageWx.getStorageSync('paoxia.activeRun'), '');
home.onShow();assert.equal(home.data.hasActiveRun,false);
const recap=load('recap',{redirectTo:x=>{navigation=x.url;x.complete();}});
recap.onLoad({durationSeconds:'8'});assert.equal(recap.data.safeTop,108);assert.equal(recap.data.durationText,'8 sec');
assert.equal(recap.data.weather,'');assert.equal(recap.data.mood,'');assert.equal(Object.keys(recap.data.selectedNotices).length,0);recap.toggleWeather();assert.equal(recap.data.weatherOpen,true);
recap.chooseWeather({currentTarget:{dataset:{value:'rainy'}}});assert.equal(recap.data.weather,'rainy');assert.equal(recap.data.weatherLabel,'Rainy');assert.equal(recap.data.weatherOpen,false);
recap.chooseMood({currentTarget:{dataset:{value:'good'}}});assert.equal(recap.data.mood,'good');
recap.chooseNotice({currentTarget:{dataset:{value:'tree'}}});assert.equal(recap.data.selectedNotices.tree,true);
const chooseNotice = value => recap.chooseNotice({currentTarget:{dataset:{value}}});
chooseNotice('wind');
chooseNotice('cloud');
assert.equal(Object.keys(recap.data.selectedNotices).join(','),'tree,wind,cloud');
chooseNotice('wind');
assert.equal(Object.keys(recap.data.selectedNotices).join(','),'tree,cloud');
chooseNotice('nothing');
assert.equal(Object.keys(recap.data.selectedNotices).join(','),'nothing');
chooseNotice('nothing');
assert.equal(Object.keys(recap.data.selectedNotices).length,0);
chooseNotice('nothing');
chooseNotice('tree');
assert.equal(Object.keys(recap.data.selectedNotices).join(','),'tree');
chooseNotice('wind');
chooseNotice('cloud');
chooseNotice('cat');
chooseNotice('streetlight');
assert.equal(recap.data.weather,'rainy');
assert.equal(recap.data.mood,'good');
recap.updateDistance({detail:{value:'5.2'}});assert.equal(recap.data.distance,'5.2');
recap.updateNote({detail:{value:'Quiet streets'}});assert.equal(recap.data.note,'Quiet streets');
recap.save();assert.equal(navigation,'/pages/history/history');assert.equal(savedRecords()[0].durationSeconds,8);assert.equal(savedRecords()[0].distance,'5.2 km');assert.equal(savedRecords()[0].mood,'Good');assert.equal(savedRecords()[0].notices.join(','),'tree,wind,cloud,cat,streetlight');
const history=load('history',{reLaunch:x=>{navigation=x.url;}});
history.onLoad();history.onShow();assert.equal(history.data.safeTop,108);assert.equal(history.data.mode,'day');assert.equal(history.data.selectedRecord.duration,'8 sec');assert.equal(history.data.selectedRecord.note,'Quiet streets');assert.equal(history.data.selectedRecord.weatherClass,'rainy');
assert.equal(history.data.records.length,1);
assert.equal(history.data.selectedRecord.distance,'5.2 km');
assert.equal(history.data.selectedRecord.mood,'Good');
assert.equal(history.data.selectedRecord.noticeItems.map(item=>item.label).join(','),'Tree,Wind,Cloud,Cat,Streetlight');
assert.equal(history.data.yearRows.length,1);
assert.equal(history.data.yearRows[0].times,1);
assert.equal(history.data.yearRows[0].totalSeconds,8);
assert.equal(history.data.monthRows.length,1);
assert.equal(history.data.monthSummary.total,'8 sec.');
history.switchMode({currentTarget:{dataset:{mode:'year'}}});
assert.equal(history.data.periodLabels.year,'2028');
history.stepPeriod({currentTarget:{dataset:{direction:-1}}});
assert.equal(history.data.yearRows.length,0);
history.openMonth({currentTarget:{dataset:{month:'2028-08'}}});
assert.equal(history.data.monthRows.length,0);
assert.equal(history.data.monthSummary.times,'No days out yet.');
history.stepPeriod({currentTarget:{dataset:{direction:1}}});
assert.equal(history.data.monthValue,'2028-09');
assert.equal(history.data.monthRows.length,1);
history.openDay({currentTarget:{dataset:{date:'2028-09-26'}}});
assert.equal(history.data.selectedRecord.note,'Quiet streets');
history.chooseDay({detail:{value:'2028-09-25'}});
assert.equal(history.data.selectedRecord,null);
history.stepPeriod({currentTarget:{dataset:{direction:1}}});
assert.equal(history.data.selectedRecord.duration,'8 sec');
const reopenedHistory = load('history', {});
reopenedHistory.onLoad();assert.equal(reopenedHistory.data.selectedRecord.note,'Quiet streets');
// The formerly hard-coded demo year must also contain only the real run.
storageWx.setStorageSync('paoxia.completedRuns', [{...savedRecords()[0], date:'2026-09-26'}]);
const history2026 = load('history', {});history2026.onLoad();
assert.equal(history2026.data.yearRows.length,1);
assert.equal(history2026.data.yearRows[0].times,1);
assert.equal(history2026.data.yearRows[0].totalSeconds,8);
// An explicit negative choice and no choices are both valid saved records.
const optionalRecap = load('recap',{redirectTo:x=>{navigation=x.url;x.complete();}});
optionalRecap.onLoad({durationSeconds:'8'});
optionalRecap.chooseNotice({currentTarget:{dataset:{value:'nothing'}}});
optionalRecap.save();
const nothingHistory = load('history',{});nothingHistory.onLoad();
assert.equal(nothingHistory.data.selectedRecord.noticeItems.length,1);
assert.equal(nothingHistory.data.selectedRecord.noticeItems[0].label,'Didn’t notice');
const blankRecap = load('recap',{redirectTo:x=>{navigation=x.url;x.complete();}});
blankRecap.onLoad({durationSeconds:'8'});
blankRecap.save();
assert.equal(savedRecords()[0].notices.length,0);
const blankHistory = load('history',{});blankHistory.onLoad();
assert.equal(blankHistory.data.selectedRecord.noticeItems.length,0);
assert.equal(blankHistory.data.selectedRecord.duration,'8 sec');
assert.equal(blankHistory.data.selectedRecord.weather,'');
assert.equal(blankHistory.data.selectedRecord.mood,'Not set');
assert.equal(blankHistory.data.selectedRecord.note,'');
const recapWxml = fs.readFileSync('miniprogram/pages/recap/recap.wxml','utf8');
for (const value of ['tree','wind','cloud','cat','streetlight','nothing']) {
  assert(recapWxml.includes("selectedNotices." + value + " ? 'selected notice-red'"));
}
// A new page/module context reads persistent storage without app globals.
const newSession = load('history', {});newSession.onLoad();
assert.equal(newSession.data.records.length,3);
assert.equal(newSession.data.yearSummary.times,'2 times out.');
assert.equal(newSession.data.monthSummary.total,'16 sec.');
assert.equal(newSession.data.selectedRecord.distance,'— km');
assert.equal(new Set(newSession.data.records.map(record=>record.id)).size,3);
newSession.openDay({currentTarget:{dataset:{date:'2028-09-26',id:savedRecords()[1].id}}});
newSession.onShow();
assert.equal(newSession.data.selectedRecord.noticeItems[0].label,'Didn’t notice');
// Re-selecting Day or returning from another tab must keep the chosen run.
for (const mode of ['day','month','day','year','day']) {
  newSession.switchMode({currentTarget:{dataset:{mode}}});
  assert.equal(newSession.data.selectedRecord.id,savedRecords()[1].id);
  assert.equal(newSession.data.selectedRecord.noticeItems[0].label,'Didn’t notice');
}
newSession.openDay({currentTarget:{dataset:{date:'2028-09-26',id:savedRecords()[0].id}}});
assert.equal(newSession.data.selectedRecord.noticeItems.length,0);
// Successful saves stay single even if navigation fails or Save is tapped again.
blankRecap.save();
assert.equal(savedRecords().length,3);
// Simulate process loss with fresh page/module contexts and the same storage.
const runRuntime = { Date: clock, setInterval: fn => { tick = fn; return 1; }, clearInterval: () => {} };
now=20000;
const firstRun=load('run',{},runRuntime);
firstRun.onLoad({startedAt:'20000'});firstRun.onShow();
now=25000;firstRun.onHide();firstRun.onUnload();
now=35000;
const restoredHome=load('home',{navigateTo:x=>{navigation=x.url;x.complete();}}, {Date:clock});
restoredHome.onLoad();restoredHome.onShow();
assert.equal(restoredHome.data.hasActiveRun,true);
restoredHome.go();assert.equal(navigation,'/pages/run/run?startedAt=20000');
const restoredRun=load('run',{},runRuntime);
// Even a stale new-GO URL must restore the existing run.
restoredRun.onLoad({startedAt:'35000'});restoredRun.onShow();
assert.equal(restoredRun.data.elapsedSeconds,15);
assert.equal(restoredRun.startedAt,20000);
restoredRun.togglePause();
assert.equal(storageWx.getStorageSync('paoxia.activeRun').pausedAt,35000);
restoredRun.onUnload();now=65000;
const pausedRun=load('run',{redirectTo:x=>{navigation=x.url;x.complete();}},runRuntime);
pausedRun.onLoad({});pausedRun.onShow();
assert.equal(pausedRun.data.paused,true);
assert.equal(pausedRun.data.elapsedSeconds,15);
assert.equal(pausedRun.timer,undefined);
pausedRun.togglePause();
assert.equal(pausedRun.totalPausedMs,30000);
now=70000;tick();assert.equal(pausedRun.data.elapsedSeconds,20);
pausedRun.togglePause();pausedRun.onUnload();now=90000;
const twicePaused=load('run',{redirectTo:x=>{navigation=x.url;x.complete();}},runRuntime);
twicePaused.onLoad({});twicePaused.onShow();
assert.equal(twicePaused.data.elapsedSeconds,20);
twicePaused.togglePause();assert.equal(twicePaused.totalPausedMs,50000);
now=93000;tick();assert.equal(twicePaused.data.elapsedSeconds,23);
twicePaused.finish();assert.equal(navigation,'/pages/recap/recap?durationSeconds=23');
restoredHome.onShow();assert.equal(restoredHome.data.hasActiveRun,false);
assert.equal(storageWx.getStorageSync('paoxia.activeRun'),'');
// Failed state writes must not silently change the pause state.
now=100000;
let activeRunToast;
const writeFailure=load('run',{showToast:x=>{activeRunToast=x.title;},setStorageSync:(key,value)=>{
  if(value.pausedAt) throw new Error('storage full');
  storageWx.setStorageSync(key,value);
}},runRuntime);
writeFailure.onLoad({});writeFailure.onShow();now=105000;writeFailure.togglePause();
assert.equal(writeFailure.data.paused,false);
assert.equal(storageWx.getStorageSync('paoxia.activeRun').pausedAt,0);
assert.equal(activeRunToast,'未能保存跑步状态');
writeFailure.onUnload();
// A failed end-navigation restores the recoverable run.
const navigationFailure=load('run',{redirectTo:x=>{x.fail();x.complete();}},runRuntime);
navigationFailure.onLoad({});navigationFailure.finish();
assert.equal(navigationFailure.ended,false);
assert.equal(storageWx.getStorageSync('paoxia.activeRun').startedAt,100000);
navigationFailure.onUnload();storageWx.removeStorageSync('paoxia.activeRun');
// A failed write must keep the form and previous records intact.
let toast, failedNavigation = false;
const failedRecap = load('recap', {
  setStorageSync: () => { throw new Error('storage full'); },
  showToast: value => { toast = value.title; },
  redirectTo: () => { failedNavigation = true; }
});
failedRecap.onLoad({durationSeconds:'5'});
failedRecap.updateNote({detail:{value:'Still here'}});
failedRecap.save();
assert.equal(failedNavigation,false);
assert.equal(toast,'未能保存到本机');
assert.equal(failedRecap.data.note,'Still here');
assert.equal(failedRecap.navigating,false);
assert.equal(savedRecords().length,3);
// Different years and months aggregate independently, without demo records.
newSession.applyYear('2026');
assert.equal(newSession.data.yearRows.length,1);
assert.equal(newSession.data.yearRows[0].totalSeconds,8);
newSession.applyMonth('2026-09');
assert.equal(newSession.data.monthRows.length,1);
newSession.applyMonth('2026-08');
assert.equal(newSession.data.monthRows.length,0);
const historyWxml=fs.readFileSync('miniprogram/pages/history/history.wxml','utf8');assert(!historyWxml.includes('day-run-row'));assert(historyWxml.includes('class="day-detail"'));
assert(!historyWxml.includes('day-share'));
assert(historyWxml.includes('data-id="{{item.id}}"'));
assert(historyWxml.includes('wx:for="{{selectedRecord.noticeItems}}"'));
assert(/\.day-notices\s*\{[^}]*flex-wrap:\s*wrap/.test(fs.readFileSync('miniprogram/pages/history/history.wxss','utf8')));
assert(historyWxml.includes('wx:if="{{!records.length}}"'));
assert(historyWxml.includes('No days out yet.'));
assert(fs.readFileSync('miniprogram/pages/home/home.wxml','utf8').includes('bindtap="openHistory"'));
assert(fs.readFileSync('miniprogram/pages/home/home.wxml','utf8').includes("hasActiveRun ? '继续这次' : 'GO'"));
assert(!historyWxml.includes('day-sun'));assert(!historyWxml.includes('day-tree'));assert(historyWxml.includes('day-summary-illustration'));
assert(historyWxml.includes('>DAY<'));assert(historyWxml.includes('day-feeling'));
assert(!historyWxml.includes('one day at a time'));
history.goAgain();assert.equal(navigation,'/pages/home/home');
assert.equal(time.formatElapsed(3661),'01:01:01');
assert.equal(time.formatDuration(3661),'1 hr 1 min');
assert(!/wx\.cloud|wx\.request|Storage/.test(fs.readFileSync('miniprogram/pages/run/run.js','utf8')));
assert(!/wx\.cloud|wx\.request|Storage/.test(fs.readFileSync('miniprogram/pages/recap/recap.js','utf8')));
console.log('PASS: routes, timer, active-run restart/pause recovery, GO overwrite protection, end cleanup, recap, persistent multi-run history, same-day details, real aggregates, optional fields, and storage failure handling.');
