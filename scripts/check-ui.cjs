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
const appConfig = JSON.parse(fs.readFileSync('miniprogram/app.json'));
const appWxss = fs.readFileSync('miniprogram/app.wxss','utf8');
assert(appWxss.includes('@import "styles/inter.wxss"'));
assert(!appWxss.includes('styles/handwriting.wxss'));
assert(!appWxss.includes('styles/typography.wxss'));
assert(/\.lang-en[\s\S]*font-family:\s*'Inter',\s*sans-serif/.test(appWxss));
assert(/\.lang-zh \.handwritten[\s\S]*font-family:[^;]*'PingFang SC'/.test(appWxss));
assert(fs.readFileSync('miniprogram/styles/inter.wxss','utf8').includes("font-family: 'Inter'"));
assert(fs.existsSync('miniprogram/assets/Inter-OFL.txt'));
function directoryBytes(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((sum, entry) => {
    const target = `${directory}/${entry.name}`;
    return sum + (entry.isDirectory() ? directoryBytes(target) : fs.statSync(target).size);
  }, 0);
}
assert(directoryBytes('miniprogram') < 2 * 1024 * 1024);
const pages = appConfig.pages;
assert.equal(appConfig.requiredBackgroundModes, undefined);
assert.equal(appConfig.permission, undefined);
assert.equal(appConfig.requiredPrivateInfos, undefined);
for (const route of pages) for (const ext of ['js','json','wxml','wxss']) assert(fs.existsSync(`miniprogram/${route}.${ext}`));
function load(route, wx, globals = {}) {
  let page;
  const runtimeWx = { ...storageWx, ...wx };
  const recordsModule = { exports: {} };
  vm.runInNewContext(fs.readFileSync('miniprogram/utils/records.js', 'utf8'), { module: recordsModule, wx: runtimeWx });
  const activeRunModule = { exports: {} };
  vm.runInNewContext(fs.readFileSync('miniprogram/utils/active-run.js', 'utf8'), { module: activeRunModule, wx: runtimeWx });
  const draftModule = { exports: {} };
  vm.runInNewContext(fs.readFileSync('miniprogram/utils/recap-draft.js', 'utf8'), { module: draftModule, wx: runtimeWx, require: () => recordsModule.exports });
  const i18nModule = { exports: {} };
  vm.runInNewContext(fs.readFileSync('miniprogram/utils/i18n.js', 'utf8'), { module: i18nModule, wx: runtimeWx });
  const shareModule = { exports: {} };
  vm.runInNewContext(fs.readFileSync('miniprogram/utils/share.js', 'utf8'), { module: shareModule, wx: runtimeWx });
  const context = {
    Page: x => page=x,
    wx: runtimeWx,
    Date: TestDate,
    require: request => request.endsWith('/share') ? shareModule.exports : request.endsWith('/recap-draft') ? draftModule.exports : request.endsWith('/i18n') ? i18nModule.exports : request.endsWith('/time') ? time : request.endsWith('/records') ? recordsModule.exports : request.endsWith('/active-run') ? activeRunModule.exports : { safeTop: () => 108 },
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
const initialRunStart = new TestDate(2028, 8, 26, 11, 59, 48).getTime();
let now = initialRunStart;
const clock = { now: () => now };
const home = load('home', {navigateTo: x => {navigation=x.url;completed=x.complete;}}, { Date: clock });
home.onLoad(); assert.equal(home.data.safeTop, 108);
home.chooseLanguage({ currentTarget: { dataset: { language: 'zh' } } });
assert.equal(storageWx.getStorageSync('paoxia.language'), 'zh');assert.equal(home.data.copy.go, '出发');
navigation = null;home.go();assert.equal(navigation, '/pages/run/run');completed();
home.openHistory();assert.equal(navigation, '/pages/history/history');completed();
home.chooseLanguage({ currentTarget: { dataset: { language: 'en' } } });
assert.equal(storageWx.getStorageSync('paoxia.language'), 'en');assert.equal(home.data.copy.go, 'START');
home.openHistory(); assert.equal(navigation, '/pages/history/history');
navigation=null;home.openHistory();assert.equal(navigation,null);completed();
home.go();assert.equal(navigation, '/pages/run/run');
navigation=null;home.go();home.openHistory();assert.equal(navigation,null);completed();
assert.equal(storageWx.getStorageSync('paoxia.activeRun'), '');
let startFailure = false;
const failedStart = load('home', {
  navigateTo: options => { options.fail();options.complete(); },
  showToast: () => { startFailure = true; }
});
failedStart.go();assert.equal(startFailure, true);assert.equal(failedStart.navigating, false);
startFailure = false;
failedStart.openHistory();assert.equal(startFailure, true);assert.equal(failedStart.navigating, false);
const thrownStart = load('home', {
  navigateTo: () => { throw new Error('page loading failed'); }, showToast: () => {}
});
thrownStart.go();assert.equal(thrownStart.navigating, false);
home.navigating = true;home.onShow();assert.equal(home.navigating, false);
now = initialRunStart;
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
let runRenders = 0;
const originalRunSetData = run.setData;
run.setData = update => { runRenders++; originalRunSetData(update); };
run.onLoad({startedAt:String(initialRunStart)});run.onShow();
assert.equal(runRenders, 1);
run.updateClock();assert.equal(runRenders, 1);
assert.equal(run.data.elapsedText,'00:00:00');
now=initialRunStart+5500;tick();assert.equal(run.data.elapsedText,'00:00:05');
run.togglePause();assert.equal(run.data.paused,true);
now=initialRunStart+8500;run.updateClock();assert.equal(run.data.elapsedText,'00:00:05');
run.togglePause();assert.equal(run.data.paused,false);
now=initialRunStart+11500;tick();assert.equal(run.data.elapsedText,'00:00:08');
run.finish();assert.equal(navigation,'/pages/recap/recap?durationSeconds=8');
assert.equal(storageWx.getStorageSync('paoxia.activeRun'), '');
assert.equal(storageWx.getStorageSync('paoxia.recapDraft').distance, '');
home.onShow();assert.equal(home.data.hasActiveRun,false);

const runWxml = fs.readFileSync('miniprogram/pages/run/run.wxml','utf8');
assert(!runWxml.includes('location-status'));
assert(!runWxml.includes('distanceText'));

const recap=load('recap',{redirectTo:x=>{navigation=x.url;x.complete();}});
recap.onLoad({durationSeconds:'8'});assert.equal(recap.data.safeTop,108);assert.equal(recap.data.durationText,'8 sec');
assert.equal(recap.data.copy.continueRun,'Continue');assert.equal(recap.data.copy.discardDraft,'Discard');
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
assert.equal(savedRecords()[0].date,'2028-09-26');assert.equal(savedRecords()[0].startedAt,initialRunStart);assert.equal(savedRecords()[0].finishedAt,initialRunStart+11500);
const history=load('history',{reLaunch:x=>{navigation=x.url;}});
history.onLoad();history.onShow();assert.equal(history.data.safeTop,108);assert.equal(history.data.mode,'day');assert.equal(history.data.selectedRecord.duration,'8 sec');assert.equal(history.data.selectedRecord.note,'Quiet streets');assert.equal(history.data.selectedRecord.weatherClass,'rainy');
assert.match(history.data.selectedRecord.runnerImage,/^\/assets\/history-runner-\d{2}\.png$/);
assert.match(history.data.selectedRecord.runnerPoseClass,/^pose-\d{2}$/);
const firstRunnerImage = history.data.selectedRecord.runnerImage;
history.applyDay(history.data.dayValue, history.data.selectedRecord.id);
assert.equal(history.data.selectedRecord.runnerImage,firstRunnerImage);
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
assert.equal(nothingHistory.data.selectedRecord.noticeItems[0].label,'Nothing');
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
const recapWxss = fs.readFileSync('miniprogram/pages/recap/recap.wxss','utf8');
assert(/\.recap \.continue-button[^}]*width:\s*100%[^}]*white-space:\s*nowrap/.test(recapWxss));
const historyPoseWxml = fs.readFileSync('miniprogram/pages/history/history.wxml','utf8');
assert(historyPoseWxml.includes('src="{{selectedRecord.runnerImage}}"'));
for (let index = 1; index <= 10; index += 1) {
  assert(fs.existsSync(`miniprogram/assets/history-runner-${String(index).padStart(2,'0')}.png`));
}
assert(recapWxml.includes('class="distance-input handwritten"'));
assert(!recapWxml.includes('自动记录的跑步距离'));
assert(!recapWxml.includes('wx:if="{{editing}}" class="distance-input'));
for (const value of ['tree','people','cloud','cat','streetlight','dog','flower','nothing']) {
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
assert.equal(newSession.data.selectedRecord.noticeItems[0].label,'Nothing');
// Re-selecting Day or returning from another tab must keep the chosen run.
for (const mode of ['day','month','day','year','day']) {
  newSession.switchMode({currentTarget:{dataset:{mode}}});
  assert.equal(newSession.data.selectedRecord.id,savedRecords()[1].id);
  assert.equal(newSession.data.selectedRecord.noticeItems[0].label,'Nothing');
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
assert.equal(activeRunToast,'Could not save run state.');
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
assert.equal(toast,'Could not save this run. Try again.');
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
assert(historyWxml.includes('<view wx:elif="{{selectedRecord}}" class="day-detail">'));
assert.equal(JSON.parse(fs.readFileSync('miniprogram/pages/history/history.json')).disableScroll, true);
assert.equal(JSON.parse(fs.readFileSync('miniprogram/pages/recap/recap.json')).disableScroll, true);
assert(/\.day-notices\s*\{[^}]*flex-wrap:\s*wrap/.test(fs.readFileSync('miniprogram/pages/history/history.wxss','utf8')));
assert(historyWxml.includes('wx:if="{{!records.length}}"'));
assert(historyWxml.includes('{{copy.noRuns}}'));
assert(fs.readFileSync('miniprogram/pages/home/home.wxml','utf8').includes('bindtap="openHistory"'));
assert(fs.readFileSync('miniprogram/pages/home/home.wxml','utf8').includes('hasDraft ? copy.continueDraft : copy.go'));
assert(fs.readFileSync('miniprogram/pages/home/home.wxml','utf8').includes('src="/assets/home-shoelaces.png"'));
assert(!historyWxml.includes('day-sun'));assert(!historyWxml.includes('day-tree'));assert(historyWxml.includes('day-summary-illustration'));
assert(historyWxml.includes('{{copy.dayKicker}}'));assert(historyWxml.includes('day-feeling'));
assert(!historyWxml.includes('one day at a time'));
const historyWxss=fs.readFileSync('miniprogram/pages/history/history.wxss','utf8');assert(/\.day-date-stack\s*\{[^}]*500rpx/.test(historyWxss));assert(/\.day-period-copy \.period-label\s*\{[^}]*font-size:\s*36rpx/.test(historyWxss));assert(!historyWxml.includes('class="day-picker filter-trigger"'));
history.goAgain();assert.equal(navigation,'/pages/home/home');
assert.equal(time.formatElapsed(3661),'01:01:01');
assert.equal(time.formatDuration(3661),'1 hr 1 min');
assert.equal(time.formatDuration(3661,'zh'),'1小时 1分钟');
assert(!/wx\.cloud|wx\.request|Storage/.test(fs.readFileSync('miniprogram/pages/run/run.js','utf8')));
assert(!/wx\.cloud|wx\.request|Storage/.test(fs.readFileSync('miniprogram/pages/recap/recap.js','utf8')));
// Slice 5: fresh page/module contexts simulate closing and reopening the app.
storage.clear();
const draftRuntime = {
  redirectTo: x => { navigation = x.url; x.complete(); },
  reLaunch: x => { navigation = x.url; },
  showToast: x => { toast = x.title; }
};
const pick = value => ({ currentTarget: { dataset: { value } } });
const input = value => ({ detail: { value } });
const draftPage = load('recap', draftRuntime);
draftPage.onLoad({ durationSeconds: '125' });
draftPage.chooseWeather(pick('cloudy'));
draftPage.chooseMood(pick('calm'));
draftPage.chooseNotice(pick('tree'));
draftPage.chooseNotice(pick('wind'));
draftPage.chooseNotice(pick('dog'));
draftPage.chooseNotice(pick('flower'));
draftPage.chooseNotice(pick('dog'));
assert.equal(draftPage.data.selectedNotices.dog, undefined);
draftPage.chooseNotice(pick('dog'));
// Fields are persisted during input, without depending on exit callbacks.
let recovered = load('recap', draftRuntime);
recovered.onLoad({});
assert.equal(recovered.data.durationSeconds, 125);
assert.equal(recovered.data.weather, 'cloudy');
assert.equal(recovered.data.weatherLabel, 'Cloudy');
assert.equal(recovered.data.weatherGlyph, '☁︎');
assert.equal(recovered.data.mood, 'calm');
assert.equal(Object.keys(recovered.data.selectedNotices).join(','), 'tree,wind,flower,dog');
assert.equal(recovered.data.distance, '');
assert.equal(recovered.data.note, '');
const draftHome = load('home', { navigateTo: x => { navigation = x.url; x.complete(); } });
draftHome.onShow();assert.equal(draftHome.data.hasDraft, true);
draftHome.go();assert.equal(navigation, '/pages/recap/recap');
const draftHistory = load('history', {});draftHistory.onLoad();
assert.equal(draftHistory.data.records.length, 0);
recovered.updateDistance(input('3.25'));
recovered.updateNote(input('沿途有风 🌿'));
recovered.onHide();recovered.onUnload();
recovered = load('recap', draftRuntime);recovered.onLoad({ durationSeconds: '999' });
assert.equal(recovered.data.distance, '3.25');
assert.equal(recovered.data.note, '沿途有风 🌿');
assert.equal(recovered.data.durationSeconds, 125);
recovered.save();recovered.onHide();recovered.onUnload();
assert.equal(savedRecords().length, 1);
assert.equal(savedRecords()[0].note, '沿途有风 🌿');
const newNoticeHistory = load('history', {});newNoticeHistory.onLoad();
assert.equal(newNoticeHistory.data.selectedRecord.noticeItems.map(item => item.label).join(','), 'Tree,Wind,Flower,Dog');
for (const item of newNoticeHistory.data.selectedRecord.noticeItems.filter(item => item.image)) {
  assert(fs.existsSync('miniprogram' + item.image));
}
assert.equal(newNoticeHistory.data.monthRows[0].noticeItems.length, 4);
assert.equal(storageWx.getStorageSync('paoxia.recapDraft'), '');
draftHome.onShow();assert.equal(draftHome.data.hasDraft, false);
const fresh = load('recap', draftRuntime);fresh.onLoad({ durationSeconds: '10' });
for (const field of ['weather', 'mood', 'distance', 'note']) assert.equal(fresh.data[field], '');
assert.equal(Object.keys(fresh.data.selectedNotices).length, 0);
fresh.chooseWeather(pick('rainy'));fresh.chooseWeather(pick('rainy'));
fresh.chooseMood(pick('good'));fresh.chooseMood(pick('good'));
fresh.chooseNotice(pick('dog'));fresh.chooseNotice(pick('flower'));
fresh.chooseNotice(pick('nothing'));
assert.equal(Object.keys(fresh.data.selectedNotices).join(','), 'nothing');
fresh.chooseNotice(pick('flower'));
assert.equal(Object.keys(fresh.data.selectedNotices).join(','), 'flower');
fresh.chooseNotice(pick('flower'));
fresh.updateDistance(input('2'));fresh.updateDistance(input(''));
fresh.updateNote(input('erase me'));fresh.updateNote(input(''));
const cleared = load('recap', draftRuntime);cleared.onLoad({});
for (const field of ['weather', 'mood', 'distance', 'note']) assert.equal(cleared.data[field], '');
assert.equal(Object.keys(cleared.data.selectedNotices).length, 0);
let confirmDiscard = false;
const discardPage = load('recap', { ...draftRuntime,
  showModal: x => { x.success({ confirm: confirmDiscard }); x.complete(); }
});
discardPage.onLoad({});discardPage.updateNote(input('keep until confirmed'));
discardPage.discard();
assert.equal(storageWx.getStorageSync('paoxia.recapDraft').note, 'keep until confirmed');
confirmDiscard = true;discardPage.discard();discardPage.onHide();discardPage.onUnload();
assert.equal(navigation, '/pages/home/home');
assert.equal(storageWx.getStorageSync('paoxia.recapDraft'), '');
assert.equal(discardPage.data.note, '');
assert.equal(savedRecords().length, 1);
const afterDiscard = load('recap', draftRuntime);afterDiscard.onLoad({ durationSeconds: '9' });
assert.equal(afterDiscard.data.note, '');
afterDiscard.updateNote(input('retain on failure'));
const saveFailure = load('recap', { ...draftRuntime, setStorageSync: (key, value) => {
  if (key === 'paoxia.completedRuns') throw new Error('full');
  storageWx.setStorageSync(key, value);
}});
saveFailure.onLoad({});saveFailure.save();
assert.equal(storageWx.getStorageSync('paoxia.recapDraft').note, 'retain on failure');
assert.equal(savedRecords().length, 1);
const removeFailure = load('recap', { ...draftRuntime,
  removeStorageSync: () => { throw new Error('unavailable'); },
  showModal: x => { x.success({ confirm: true }); x.complete(); }
});
removeFailure.onLoad({});removeFailure.discard();
assert.equal(removeFailure.discarded, false);
assert.equal(storageWx.getStorageSync('paoxia.recapDraft').note, 'retain on failure');
removeFailure.save();removeFailure.save();
assert.equal(savedRecords().length, 2);
// Completed drafts never reappear, even when removal failed after the record write.
draftHome.onShow();assert.equal(draftHome.data.hasDraft, false);
const afterRemovalFailure = load('recap', draftRuntime);afterRemovalFailure.onLoad({ durationSeconds: '3' });
assert.equal(afterRemovalFailure.data.note, '');
assert.equal(afterRemovalFailure.data.durationSeconds, 3);
assert(recapWxml.includes('bindtap="discard"'));
// Hot reload / failed discard navigation must not leave Save silently disabled.
storage.clear();
const stalePage = load('recap', draftRuntime);
stalePage.discarded = true;
stalePage.save();
assert.equal(navigation, '/pages/history/history');
assert.equal(savedRecords().length, 1);
const failedDiscardNavigation = load('recap', { ...draftRuntime,
  showModal: x => { x.success({ confirm: true }); x.complete(); },
  reLaunch: x => x.fail()
});
failedDiscardNavigation.onLoad({durationSeconds:'20'});
failedDiscardNavigation.updateNote(input('discard this'));
failedDiscardNavigation.discard();
assert.equal(failedDiscardNavigation.discarded, false);
assert.equal(failedDiscardNavigation.data.note, '');
assert.equal(failedDiscardNavigation.data.durationSeconds, 0);
failedDiscardNavigation.save();
assert.equal(navigation, '/pages/history/history');
assert.equal(savedRecords().length, 2);
assert.equal(savedRecords()[0].note, '');
// Slice 6: Done -> recap -> continue preserves the run, optional fields and pause state.
for (const pausedBeforeDone of [false, true]) {
  storage.clear();
  now = 100000;
  const original = load('run', draftRuntime, runRuntime);
  original.onLoad({});original.onShow();
  now = 105500;
  if (pausedBeforeDone) original.togglePause();
  now = 108500;original.finish();original.onUnload();
  const firstDuration = pausedBeforeDone ? 5 : 8;
  assert.equal(storageWx.getStorageSync('paoxia.recapDraft').durationSeconds, firstDuration);
  assert.equal(storageWx.getStorageSync('paoxia.activeRun'), '');
  const form = load('recap', draftRuntime, { Date: clock });form.onLoad({});
  assert.equal(form.data.canContinue, true);
  form.chooseWeather(pick('rainy'));form.chooseMood(pick('calm'));
  form.chooseNotice(pick('tree'));form.chooseNotice(pick('wind'));
  form.updateDistance(input('2.4'));form.updateNote(input('Keep this note'));
  const draftId = form.draftId;
  form.onHide();form.onUnload();
  now = 168500;
  const reopened = load('recap', draftRuntime, { Date: clock });reopened.onLoad({});
  reopened.continueRun();reopened.onHide();reopened.onUnload();
  assert.equal(navigation, '/pages/run/run?continue=1');
  const continued = load('run', draftRuntime, runRuntime);continued.onLoad({ continue: '1' });continued.onShow();
  draftHome.onShow();draftHome.go();
  assert.equal(navigation, '/pages/run/run?startedAt=100000');
  assert.equal(continued.startedAt, 100000);
  assert.equal(continued.data.elapsedSeconds, firstDuration);
  assert.equal(continued.data.paused, pausedBeforeDone);
  now = 178500;continued.updateClock();
  assert.equal(continued.data.elapsedSeconds, firstDuration + (pausedBeforeDone ? 0 : 10));
  if (pausedBeforeDone) continued.togglePause();
  now = 183500;continued.togglePause();
  const beforePause = continued.data.elapsedSeconds;
  now = 193500;continued.updateClock();assert.equal(continued.data.elapsedSeconds, beforePause);
  continued.togglePause();now = 195500;continued.finish();continued.onUnload();
  const again = load('recap', draftRuntime, { Date: clock });again.onLoad({});
  assert.equal(again.draftId, draftId);
  assert.equal(again.data.durationSeconds, beforePause + 2);
  assert.equal(again.data.weather, 'rainy');assert.equal(again.data.mood, 'calm');
  assert.equal(Object.keys(again.data.selectedNotices).join(','), 'tree,wind');
  assert.equal(again.data.distance, '2.4');assert.equal(again.data.note, 'Keep this note');
  // Repeat the round trip to catch double-counted form time.
  now = 225500;again.continueRun();again.onUnload();
  const lastRun = load('run', draftRuntime, runRuntime);lastRun.onLoad({ continue: '1' });lastRun.onShow();
  assert.equal(lastRun.data.elapsedSeconds, beforePause + 2);
  now = 228500;lastRun.finish();lastRun.onUnload();
  const lastForm = load('recap', draftRuntime);lastForm.onLoad({});lastForm.save();
  assert.equal(savedRecords().length, 1);
  assert.equal(savedRecords()[0].id, draftId);
  assert.equal(savedRecords()[0].durationSeconds, beforePause + 5);
  assert.equal(savedRecords()[0].note, 'Keep this note');
  // Successful navigation leaves the outgoing form untouched, avoiding a
  // one-frame flash where only "Discard" remains visible.
  assert.equal(lastForm.data.canContinue, true);
  navigation = null;lastForm.continueRun();assert.equal(navigation, null);
  assert.equal(storageWx.getStorageSync('paoxia.activeRun'), '');
  assert.equal(storageWx.getStorageSync('paoxia.recapDraft'), '');
  const afterSave = load('recap', draftRuntime);afterSave.onLoad({});
  assert.equal(afterSave.data.canContinue, false);
}
// Failed Done persistence keeps the original timer recoverable.
storage.clear();now = 300000;
const failedDone = load('run', { ...draftRuntime, setStorageSync: (key, value) => {
  if (key === 'paoxia.recapDraft') throw new Error('full');
  storageWx.setStorageSync(key, value);
}}, runRuntime);
failedDone.onLoad({});failedDone.onShow();now = 305000;
navigation = null;failedDone.finish();
assert.equal(navigation, null);assert.equal(failedDone.ended, false);
assert.equal(storageWx.getStorageSync('paoxia.activeRun').startedAt, 300000);
failedDone.onUnload();
const finishRetry = load('run', draftRuntime, runRuntime);finishRetry.onLoad({});finishRetry.finish();
// Failed continue navigation leaves the draft available and excludes all form time on retry.
const failedContinue = load('recap', { ...draftRuntime,
  redirectTo: x => { x.fail();x.complete(); }
}, { Date: clock });failedContinue.onLoad({});
now = 365000;failedContinue.continueRun();
assert.equal(storageWx.getStorageSync('paoxia.activeRun'), '');
assert.equal(failedContinue.navigating, false);
assert.equal(failedContinue.data.canContinue, true);
now = 395000;
const retryContinue = load('recap', draftRuntime, { Date: clock });retryContinue.onLoad({});retryContinue.continueRun();
const afterRetry = load('run', draftRuntime, runRuntime);afterRetry.onLoad({ continue: '1' });
assert.equal(afterRetry.data.elapsedSeconds, 5);
afterRetry.finish();
// A saved record is authoritative even if draft cleanup and navigation both fail.
const savedWithFailure = load('recap', { ...draftRuntime,
  removeStorageSync: () => { throw new Error('unavailable'); },
  redirectTo: x => { x.fail();x.complete(); }
});savedWithFailure.onLoad({});savedWithFailure.save();
navigation = null;savedWithFailure.continueRun();assert.equal(navigation, null);
assert.equal(savedWithFailure.data.canContinue, false);
const reopenSaved = load('recap', draftRuntime);reopenSaved.onLoad({});
assert.equal(reopenSaved.data.canContinue, false);
assert.equal(storageWx.getStorageSync('paoxia.activeRun'), '');
const staleContinue = load('run', draftRuntime, runRuntime);
staleContinue.onLoad({ continue: '1' });
assert.equal(staleContinue.ended, true);
assert.equal(storageWx.getStorageSync('paoxia.activeRun'), '');
assert(recapWxml.includes('wx:if="{{canContinue}}"'));
assert(recapWxml.includes('bindtap="continueRun"'));
console.log('PASS: routes, timer, manual distance entry, active-run recovery, persistent history, recap drafts, Done/continue round trips, paused state, updated duration, save lockout and storage/navigation failures.');
// Saving a restored draft later must retain the run's completion date and timestamps.
storage.clear();
const archivedStart = new TestDate(2026, 8, 26, 21, 0, 0).getTime();
const archivedFinish = new TestDate(2026, 8, 26, 21, 30, 0).getTime();
storageWx.setStorageSync('paoxia.recapDraft', {
  id: 'archived-date', durationSeconds: 1800, weather: '', mood: '', selectedNotices: {}, distance: '', note: '',
  run: { startedAt: archivedStart, pausedAt: 0, totalPausedMs: 0, finishedAt: archivedFinish }
});
const laterSave = load('recap', draftRuntime);laterSave.onLoad({});laterSave.save();
assert.equal(savedRecords()[0].date, '2026-09-26');
assert.equal(savedRecords()[0].startedAt, archivedStart);assert.equal(savedRecords()[0].finishedAt, archivedFinish);
// Slice 7: edit an older run on a day with multiple records, without touching drafts.
storage.clear();
const originalRecords = [
  { id: 'newer', date: '2026-09-26', durationSeconds: 30, distance: '— km', mood: 'Not set', moodType: 'unsure', notices: [], note: 'Keep newer', weather: '' },
  { id: 'older', date: '2026-09-26', durationSeconds: 125, distance: '2.4 km', mood: 'Calm', moodType: 'calm', notices: ['tree', 'wind'], note: 'Original note', weather: 'rainy', startedAt: 12345 }
];
storageWx.setStorageSync('paoxia.completedRuns', originalRecords);
const separateDraft = load('recap', draftRuntime);separateDraft.onLoad({ durationSeconds: '9' });
separateDraft.updateNote(input('Unrelated draft'));
storageWx.setStorageSync('paoxia.activeRun', { startedAt: 999, pausedAt: 0, totalPausedMs: 0 });
const untouchedDraft = storage.get('paoxia.recapDraft');
const untouchedRun = storage.get('paoxia.activeRun');
const editHistory = load('history', { navigateTo: x => { navigation = x.url;x.complete(); } });
editHistory.onLoad();editHistory.openDay({ currentTarget: { dataset: { date: '2026-09-26', id: 'older' } } });
editHistory.editRecord();assert.equal(navigation, '/pages/recap/recap?recordId=older');
let backCount = 0;
const editRuntime = { ...draftRuntime, navigateBack: x => { backCount++;editHistory.onShow();x.complete(); } };
const editor = load('recap', editRuntime);editor.onLoad({ recordId: 'older' });
assert.equal(editor.data.editing, true);assert.equal(editor.data.canContinue, false);
assert.equal(editor.data.durationSeconds, 125);assert.equal(editor.data.weather, 'rainy');
assert.equal(editor.data.mood, 'calm');assert.equal(editor.data.distance, '2.4');
assert.equal(editor.data.note, 'Original note');assert.equal(Object.keys(editor.data.selectedNotices).join(','), 'tree,wind');
editor.chooseWeather(pick('sunny'));assert.equal(editor.data.weather, 'rainy');
editor.updateDistance(input('3.5'));editor.chooseMood(pick('good'));editor.chooseNotice(pick('flower'));
editor.updateNote(input('Updated note'));editor.onHide();editor.onUnload();
assert.equal(savedRecords()[1].note, 'Original note');
editor.save();editor.save();
assert.equal(savedRecords().length, 2);assert.equal(backCount, 2);
assert.equal(editHistory.data.selectedRecord.id, 'older');assert.equal(editHistory.data.selectedRecord.note, 'Updated note');
assert.equal(editHistory.data.selectedRecord.distance, '3.5 km');assert.equal(editHistory.data.selectedRecord.mood, 'Good');
assert.equal(editHistory.data.selectedRecord.noticeItems.length, 3);
assert.equal(editHistory.data.monthRows.find(item => item.id === 'older').note, 'Updated note');
assert.equal(editHistory.data.yearSummary.total, '2 min.');
assert.deepEqual(savedRecords()[0], originalRecords[0]);
for (const field of ['id', 'date', 'durationSeconds', 'weather', 'startedAt']) assert.equal(savedRecords()[1][field], originalRecords[1][field]);
const clearing = load('recap', editRuntime);clearing.onLoad({ recordId: 'older' });
clearing.chooseMood(pick('good'));for (const notice of ['tree','wind','flower']) clearing.chooseNotice(pick(notice));
clearing.updateDistance(input(''));clearing.updateNote(input(''));clearing.save();
assert.equal(editHistory.data.selectedRecord.note, '');assert.equal(editHistory.data.selectedRecord.distance, '— km');
assert.equal(editHistory.data.selectedRecord.mood, 'Not set');assert.equal(editHistory.data.selectedRecord.noticeItems.length, 0);
const cancelling = load('recap', editRuntime);cancelling.onLoad({ recordId: 'older' });
assert.equal(cancelling.data.mood, '');assert.equal(cancelling.data.distance, '');
cancelling.updateNote(input('Do not save'));cancelling.chooseNotice(pick('dog'));cancelling.cancelEdit();cancelling.onUnload();
assert.equal(savedRecords()[1].note, '');assert.equal(savedRecords()[1].notices.length, 0);
const failedEdit = load('recap', { ...editRuntime, setStorageSync: () => { throw new Error('full'); } });
failedEdit.onLoad({ recordId: 'older' });failedEdit.updateNote(input('Retry this'));
const beforeFailedEdit = backCount;failedEdit.save();assert.equal(backCount, beforeFailedEdit);
assert.equal(failedEdit.data.note, 'Retry this');assert.equal(failedEdit.saved, false);assert.equal(savedRecords()[1].note, '');
const missingEdit = load('recap', editRuntime);missingEdit.onLoad({ recordId: 'missing' });missingEdit.save();missingEdit.discard();
assert.equal(savedRecords().length, 2);assert.equal(missingEdit.draftId, null);
const fallbackEdit = load('recap', { ...editRuntime, navigateBack: x => { x.fail();x.complete(); } });
fallbackEdit.onLoad({ recordId: 'older' });fallbackEdit.updateNote(input('Persist after navigation failure'));fallbackEdit.save();
assert.equal(navigation, '/pages/history/history?recordId=older');
const reopenedDetail = load('history', {});reopenedDetail.onLoad({ recordId: 'older' });reopenedDetail.onShow();
assert.equal(reopenedDetail.data.selectedRecord.id, 'older');assert.equal(reopenedDetail.data.selectedRecord.note, 'Persist after navigation failure');
let confirmDelete = false;
const deleteRuntime = { ...editRuntime,
  showModal: x => { x.success({ confirm: confirmDelete });x.complete(); }
};
const deleteEditor = load('recap', deleteRuntime);deleteEditor.onLoad({ recordId: 'older' });
const beforeDeleteBack = backCount;deleteEditor.deleteRun();
assert.equal(savedRecords().length, 2);assert.equal(backCount, beforeDeleteBack);
confirmDelete = true;deleteEditor.deleteRun();
assert.equal(savedRecords().length, 1);assert.equal(savedRecords()[0].id, 'newer');assert.equal(backCount, beforeDeleteBack + 1);
assert.equal(editHistory.data.selectedRecord.id, 'newer');assert.equal(editHistory.data.yearSummary.times, '1 times out.');
const failedDelete = load('recap', { ...deleteRuntime,
  setStorageSync: () => { throw new Error('full'); }
});
failedDelete.onLoad({ recordId: 'newer' });failedDelete.deleteRun();
assert.equal(savedRecords().length, 1);assert.equal(failedDelete.discarded, false);
assert.equal(toast, 'Could not delete this run. Try again.');
assert.equal(storage.get('paoxia.recapDraft'), untouchedDraft);assert.equal(storage.get('paoxia.activeRun'), untouchedRun);
const staleCompletedDraft = { id: 'newer', durationSeconds: 30, weather: '', mood: '', selectedNotices: {}, distance: '', note: 'stale' };
storageWx.setStorageSync('paoxia.recapDraft', staleCompletedDraft);
const cleanupFailureDelete = load('recap', { ...deleteRuntime,
  removeStorageSync: key => { if (key === 'paoxia.recapDraft') throw new Error('unavailable'); storageWx.removeStorageSync(key); }
});
cleanupFailureDelete.onLoad({ recordId: 'newer' });cleanupFailureDelete.deleteRun();
assert.equal(savedRecords().length, 1);assert.equal(storageWx.getStorageSync('paoxia.recapDraft').id, 'newer');
const cleanupRetryDelete = load('recap', deleteRuntime);cleanupRetryDelete.onLoad({ recordId: 'newer' });cleanupRetryDelete.deleteRun();
assert.equal(savedRecords().length, 0);assert.equal(storageWx.getStorageSync('paoxia.recapDraft'), '');
assert(historyWxml.includes('bindtap="editRecord"'));assert(recapWxml.includes('bindtap="cancelEdit"'));assert(recapWxml.includes('bindtap="deleteRun"'));
console.log('PASS: Slice 7 — original values, targeted update, deletion confirmation, immediate detail refresh, clearing, cancellation, no duplicates, timing preservation, draft isolation and failure handling.');

// Language choice persists and localizes all four pages without changing saved record values.
storage.clear();storageWx.setStorageSync('paoxia.language', 'zh');
storageWx.setStorageSync('paoxia.completedRuns', [{ id: 'zh-run', date: '2026-09-26', durationSeconds: 125,
  distance: '2.4 km', mood: 'Calm', moodType: 'calm', notices: ['tree'], note: '', weather: 'rainy' }]);
const zhHome = load('home', {});zhHome.onLoad();zhHome.onShow();
assert.equal(zhHome.data.language, 'zh');assert.equal(zhHome.data.copy.go, '出发');assert.equal(zhHome.data.copy.history, '跑跑记记');
const zhRun = load('run', {}, { Date: clock, setInterval: () => 1, clearInterval: () => {} });zhRun.onLoad({ startedAt: String(now) });
assert.equal(zhRun.data.copy.moving, '跑下');assert.equal(zhRun.data.copy.pause, '暂停');
const zhRecap = load('recap', {});zhRecap.onLoad({ recordId: 'zh-run' });
assert.equal(zhRecap.data.durationText, '2分钟');assert.equal(zhRecap.data.copy.so, '跑完啦');assert.equal(zhRecap.data.copy.howWasIt, '还好吗你？');assert.equal(zhRecap.data.weatherLabel, '下雨');
const zhHistory = load('history', {});zhHistory.onLoad({ recordId: 'zh-run' });
assert.equal(zhHistory.data.periodLabels.month, '2026年9月');assert.equal(zhHistory.data.periodLabels.day, '2026年9月26日');
assert.equal(zhHistory.data.copy.title, '跑跑记记');
assert.equal(zhHistory.data.monthRows[0].day, '9月26日');assert.equal(zhHistory.data.yearRows[0].month, '9月');
assert.equal(zhHistory.data.selectedRecord.duration, '2分钟');assert.equal(zhHistory.data.selectedRecord.mood, '平静');assert.equal(zhHistory.data.selectedRecord.noticeItems[0].label, '树');
assert.equal(zhHistory.data.yearSummary.times, '1次跑步');assert.equal(zhHistory.data.monthSummary.total, '2分钟');
assert.equal(zhHistory.data.copy.cancelFilter, '取消');assert.equal(zhHistory.data.copy.confirmFilter, '确定');
storageWx.setStorageSync('paoxia.language', 'en');
const enFilterHistory = load('history', {});enFilterHistory.onLoad({ recordId: 'zh-run' });
enFilterHistory.switchMode({ currentTarget: { dataset: { mode: 'month' } } });
enFilterHistory.openDateFilter({ currentTarget: { dataset: { mode: 'month' } } });
assert.equal(enFilterHistory.data.copy.cancelFilter, 'Cancel');assert.equal(enFilterHistory.data.copy.confirmFilter, 'Confirm');
assert.equal(enFilterHistory.data.filterMonths[8].label, 'September');
enFilterHistory.changeDateFilter({ detail: { value: [6, 7] } });enFilterHistory.confirmDateFilter();
assert.equal(enFilterHistory.data.monthValue, '2026-08');assert.equal(enFilterHistory.data.filterOpen, false);
enFilterHistory.switchMode({ currentTarget: { dataset: { mode: 'year' } } });
enFilterHistory.applyYear('2025');
enFilterHistory.openDateFilter({ currentTarget: { dataset: { mode: 'year' } } });
assert.equal(enFilterHistory.data.filterTitle, 'Filter year');
assert.equal(JSON.stringify(enFilterHistory.data.filterValue), '[5]');
enFilterHistory.changeDateFilter({ detail: { value: [4] } });
enFilterHistory.cancelDateFilter();
assert.equal(enFilterHistory.data.periodLabels.year, '2025');
enFilterHistory.openDateFilter({ currentTarget: { dataset: { mode: 'year' } } });
enFilterHistory.changeDateFilter({ detail: { value: [6] } });
enFilterHistory.confirmDateFilter();
assert.equal(enFilterHistory.data.periodLabels.year, '2026');
assert.equal(enFilterHistory.data.yearRows.length, 1);
assert.equal(enFilterHistory.data.filterOpen, false);
const homeWxml = fs.readFileSync('miniprogram/pages/home/home.wxml','utf8');
assert(homeWxml.includes('data-language="en"'));assert(homeWxml.includes('data-language="zh"'));
const animatedRunWxml = fs.readFileSync('miniprogram/pages/run/run.wxml','utf8');
const animatedRunWxss = fs.readFileSync('miniprogram/pages/run/run.wxss','utf8');
assert(animatedRunWxml.includes("paused ? 'is-paused' : 'is-running'"));
assert(animatedRunWxss.includes('@keyframes runner-stride'));assert(animatedRunWxss.includes('.run-runner.is-paused'));
console.log('PASS: persistent EN / 中文 selection and localized home, run, recap, dates, summaries and saved-record presentation.');

// Sharing must not forward a local record URL or use a private page screenshot.
for (const route of ['home', 'run', 'recap', 'history']) {
  let shareMenu;
  const page = load(route, { showShareMenu: options => { shareMenu = options; } });
  page.ended = true;
  page.onShow();
  assert.equal(JSON.stringify(shareMenu.menus), JSON.stringify(route === 'home'
    ? ['shareAppMessage', 'shareTimeline'] : ['shareAppMessage']));
  for (const language of ['en', 'zh']) {
    page.data.language = language;
    page.data.note = 'PRIVATE_NOTE';
    page.options = { recordId: 'PRIVATE_RECORD', startedAt: '12345' };
    const before = JSON.stringify([...storage]);
    const shared = page.onShareAppMessage({ from: 'menu' });
    assert.equal(shared.path, '/pages/home/home');
    assert(shared.title.includes(language === 'zh' ? '跑下' : 'PAOXIA'));
    assert.equal(shared.imageUrl, '/assets/runner.png');
    assert(fs.existsSync(`miniprogram${shared.imageUrl}`));
    assert(!JSON.stringify(shared).includes('PRIVATE'));
    if (route === 'home') {
      const timeline = page.onShareTimeline();
      assert.equal(timeline.query, '');
      assert.equal(timeline.title, shared.title);
      assert.equal(timeline.imageUrl, shared.imageUrl);
    } else {
      assert.equal(page.onShareTimeline, undefined);
    }
    assert.equal(JSON.stringify([...storage]), before);
  }
}
console.log('PASS: localized app shares open home, use a static image and never include local records; timeline is home-only.');

// Monthly distance includes only entered values and stays within the selected month.
const distanceSummaryPage = load('history', {});
distanceSummaryPage.onLoad();
distanceSummaryPage.data.records = [
  { id: 'distance-a', date: '2028-09-26', durationSeconds: 10, distance: '0.1 km' },
  { id: 'distance-b', date: '2028-09-27', durationSeconds: 10, distance: '0.2 km' },
  { id: 'distance-c', date: '2028-09-28', durationSeconds: 10, distance: '— km' },
  { id: 'distance-d', date: '2028-10-01', durationSeconds: 10, distance: '5 km' }
];
distanceSummaryPage.applyMonth('2028-09');
assert.equal(distanceSummaryPage.data.monthSummary.distance, '0.3 km');
distanceSummaryPage.applyYear('2028');
assert.equal(distanceSummaryPage.data.yearSummary.distance, '5.3 km');
distanceSummaryPage.applyYear('2027');
assert.equal(distanceSummaryPage.data.yearSummary.distance, '— km');
distanceSummaryPage.data.records = [distanceSummaryPage.data.records[2]];
distanceSummaryPage.applyYear('2028');
assert.equal(distanceSummaryPage.data.yearSummary.distance, '— km');
distanceSummaryPage.applyMonth('2028-09');
assert.equal(distanceSummaryPage.data.monthSummary.distance, '— km');
console.log('PASS: monthly distance totals and missing distances.');

// Notes and editable vector drawings survive draft reloads and record edits.
storage.clear();
const ink = [{ erase: false, points: [[0.1, 0.2], [0.7, 0.6]] }];
const noteWx = { showToast() {}, redirectTo() {}, navigateBack() {} };
const notePage = load('recap', noteWx);
notePage.onLoad({ durationSeconds: 7 });
notePage.updateNote({ detail: { value: 'A tree by the road' } });
notePage.updateDrawing({ detail: { strokes: ink } });
const restoredNote = load('recap', noteWx);
restoredNote.onLoad({});
assert.equal(restoredNote.data.note, 'A tree by the road');
assert.equal(JSON.stringify(restoredNote.data.noteDrawing), JSON.stringify(ink));
restoredNote.save();
const noteRecord = savedRecords()[0];
assert.equal(JSON.stringify(noteRecord.noteDrawing), JSON.stringify(ink));
const editedNote = load('recap', noteWx);
editedNote.onLoad({ recordId: noteRecord.id });
editedNote.undoDrawing();
assert.equal(editedNote.data.noteDrawing.length, 0);
assert.equal(savedRecords()[0].noteDrawing.length, 1);
editedNote.saveEdit();
assert.equal(savedRecords()[0].noteDrawing.length, 0);
assert.equal(savedRecords()[0].note, 'A tree by the road');
let drawingDefinition;
vm.runInNewContext(fs.readFileSync('miniprogram/components/drawing-board/index.js', 'utf8'), { Component: value => { drawingDefinition = value; }, wx: { showToast() {} } });
let emitted;
const board = { ...drawingDefinition.methods, width: 300, height: 225, ctx: {}, properties: { editable: true, strokes: [], tool: 'pen' }, paint() {}, triggerEvent(name, detail) { emitted = detail.strokes; this.properties.strokes = emitted; } };
board.start({ touches: [{ x: 30, y: 45 }] });
board.move({ touches: [{ x: 210, y: 135 }] });
board.finish();
assert.equal(emitted.length, 1);
assert.equal(emitted[0].points[1][0], 0.7);
board.properties.tool = 'eraser';
board.start({ touches: [{ x: 30, y: 45 }] });
board.finish();
assert.equal(emitted[1].erase, true);
board.finish();
assert.equal(emitted.length, 2);
console.log('PASS: text/drawing draft persistence, record save/edit, undo, normalized pen and eraser strokes.');
board.properties.strokes = [{ points: Array.from({ length: 6000 }, () => [0, 0]) }];
board.start({ touches: [{ x: 30, y: 45 }] });
assert.equal(board.active, null, 'full drawing must reject another stroke before bridge payload grows');
board.properties.strokes = [];
board.properties.tool = 'pen';
board.properties.color = '#3d91d0';
board.start({ touches: [{ x: 30, y: 45 }] });
board.properties.color = '#c96358';
board.move({ touches: [{ x: 60, y: 70 }] });
board.finish();
assert.equal(emitted[0].color, '#3d91d0', 'a stroke retains the color selected when it began');
const colorsPage = load('recap', noteWx);
colorsPage.onLoad({ durationSeconds: 1 });
colorsPage.selectColor({ currentTarget: { dataset: { color: '#3d91d0' } } });
assert.equal(colorsPage.data.penColor, '#3d91d0');
assert.equal(colorsPage.data.penTool, 'pen');
colorsPage.updateDrawing({ detail: { strokes: emitted } });
const colorRestore = load('recap', noteWx);
colorRestore.onLoad({});
assert.equal(colorRestore.data.noteDrawing[0].color, '#3d91d0');
console.log('PASS: pen palette selection and colored stroke persistence.');
// History bridges only the current record's drawing, never all drawings twice.
storage.clear();
storageWx.setStorageSync('paoxia.completedRuns', [
  { id: 'ink-one', date: '2026-09-30', durationSeconds: 3, noteDrawing: ink },
  { id: 'ink-two', date: '2026-09-29', durationSeconds: 4, noteDrawing: ink }
]);
const leanHistory = load('history', {});
leanHistory.onLoad({ recordId: 'ink-one' });
assert(leanHistory.data.records.every(record => record.noteDrawing === undefined));
assert(leanHistory.data.monthRows.every(record => record.noteDrawing === undefined));
assert.equal(JSON.stringify(leanHistory.data.selectedRecord.noteDrawing), JSON.stringify(ink));
leanHistory.applyDay('2026-09-29', 'ink-two');
assert.equal(JSON.stringify(leanHistory.data.selectedRecord.noteDrawing), JSON.stringify(ink));
assert.equal(storageWx.getStorageSync('paoxia.completedRuns')[0].noteDrawing.length, 1);
console.log('PASS: drawing payload limited to visible history detail; stored artwork retained.');
