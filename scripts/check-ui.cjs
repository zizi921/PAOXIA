const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const time = require('../miniprogram/utils/time');
class TestDate extends Date {
  constructor(...args) { super(...(args.length ? args : [2028, 8, 26, 12])); }
  static now() { return new TestDate().getTime(); }
}
const appState = { globalData: { latestRun: null } };
const pages = JSON.parse(fs.readFileSync('miniprogram/app.json')).pages;
for (const route of pages) for (const ext of ['js','json','wxml','wxss']) assert(fs.existsSync(`miniprogram/${route}.${ext}`));
function load(route, wx, globals = {}) {
  let page;
  const context = {
    Page: x => page=x,
    wx,
    getApp: () => appState,
    Date: TestDate,
    require: request => request.endsWith('/time') ? time : { safeTop: () => 108 },
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
recap.save();assert.equal(navigation,'/pages/history/history');assert.equal(appState.globalData.latestRun.durationSeconds,8);assert.equal(appState.globalData.latestRun.distance,'5.2 km');assert.equal(appState.globalData.latestRun.mood,'Good');assert.equal(appState.globalData.latestRun.notices.join(','),'tree,wind,cloud,cat,streetlight');
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
appState.globalData.latestRun = {...appState.globalData.latestRun, date:'2026-09-26'};
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
optionalRecap.chooseNotice({currentTarget:{dataset:{value:'nothing'}}});
optionalRecap.save();
assert.equal(appState.globalData.latestRun.notices.length,0);
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
appState.globalData.latestRun = null;
const newSession = load('history', {});newSession.onLoad();
assert.equal(newSession.data.records.length,0);
const historyWxml=fs.readFileSync('miniprogram/pages/history/history.wxml','utf8');assert(!historyWxml.includes('day-run-row'));assert(historyWxml.includes('class="day-detail"'));
assert(!historyWxml.includes('day-share'));
assert(historyWxml.includes('wx:for="{{selectedRecord.noticeItems}}"'));
assert(/\.day-notices\s*\{[^}]*flex-wrap:\s*wrap/.test(fs.readFileSync('miniprogram/pages/history/history.wxss','utf8')));
assert(historyWxml.includes('wx:if="{{!records.length}}"'));
assert(historyWxml.includes('No days out yet.'));
assert(fs.readFileSync('miniprogram/pages/home/home.wxml','utf8').includes('bindtap="openHistory"'));
assert(!historyWxml.includes('day-sun'));assert(!historyWxml.includes('day-tree'));assert(historyWxml.includes('day-summary-illustration'));
assert(historyWxml.includes('>DAY<'));assert(historyWxml.includes('day-feeling'));
assert(!historyWxml.includes('one day at a time'));
history.goAgain();assert.equal(navigation,'/pages/home/home');
assert.equal(time.formatElapsed(3661),'01:01:01');
assert.equal(time.formatDuration(3661),'1 hr 1 min');
assert(!/wx\.cloud|wx\.request|Storage/.test(fs.readFileSync('miniprogram/pages/run/run.js','utf8')));
assert(!/wx\.cloud|wx\.request|Storage/.test(fs.readFileSync('miniprogram/pages/recap/recap.js','utf8')));
console.log('PASS: routes, live timer, pause exclusion, recap handoff, truthful history filters, navigation, and no database persistence.');
