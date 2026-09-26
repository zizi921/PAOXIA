const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const time = require('../miniprogram/utils/time');
const pages = JSON.parse(fs.readFileSync('miniprogram/app.json')).pages;
for (const route of pages) for (const ext of ['js','json','wxml','wxss']) assert(fs.existsSync(`miniprogram/${route}.${ext}`));
function load(route, wx, globals = {}) {
  let page;
  const context = {
    Page: x => page=x,
    wx,
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
home.go(); assert.equal(navigation, '/pages/run/run?startedAt=1000');
navigation=null;home.go();assert.equal(navigation,null);completed();home.go();assert.equal(navigation,'/pages/run/run?startedAt=1000');
let tick;
const run=load('run',{navigateTo:x=>{navigation=x.url;x.complete();}}, {
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
assert.equal(recap.data.weather,'sunny');recap.toggleWeather();assert.equal(recap.data.weatherOpen,true);
recap.chooseWeather({currentTarget:{dataset:{value:'rainy'}}});assert.equal(recap.data.weather,'rainy');assert.equal(recap.data.weatherLabel,'Rainy');assert.equal(recap.data.weatherOpen,false);
recap.chooseMood({currentTarget:{dataset:{value:'good'}}});assert.equal(recap.data.mood,'good');
recap.chooseMood({currentTarget:{dataset:{value:'good'}}});assert.equal(recap.data.mood,'');
recap.chooseNotice({currentTarget:{dataset:{value:'tree'}}});assert.equal(recap.data.notice,'tree');
recap.updateDistance({detail:{value:'5.2'}});assert.equal(recap.data.distance,'5.2');
recap.updateNote({detail:{value:'Quiet streets'}});assert.equal(recap.data.note,'Quiet streets');
recap.save();assert.equal(navigation,'/pages/history/history');
const history=load('history',{reLaunch:x=>{navigation=x.url;}});
history.onLoad();assert.equal(history.data.safeTop,108);assert.equal(history.data.mode,'year');assert.equal(history.data.periodLabels.year,'2026');
history.stepPeriod({currentTarget:{dataset:{direction:-1}}});assert.equal(history.data.periodLabels.year,'2025');
history.stepPeriod({currentTarget:{dataset:{direction:1}}});assert.equal(history.data.periodLabels.year,'2026');
history.stepPeriod({currentTarget:{dataset:{direction:1}}});assert.equal(history.data.periodLabels.year,'2027');
history.stepPeriod({currentTarget:{dataset:{direction:-1}}});assert.equal(history.data.periodLabels.year,'2026');
history.openMonth();assert.equal(history.data.mode,'month');history.openDay();assert.equal(history.data.mode,'day');
history.goAgain();assert.equal(navigation,'/pages/home/home');
assert.equal(time.formatElapsed(3661),'01:01:01');
assert.equal(time.formatDuration(3661),'1 hr 1 min');
assert(!/wx\.cloud|wx\.request|Storage/.test(fs.readFileSync('miniprogram/pages/run/run.js','utf8')));
assert(!/wx\.cloud|wx\.request|Storage/.test(fs.readFileSync('miniprogram/pages/recap/recap.js','utf8')));
console.log('PASS: routes, live timer, pause exclusion, recap inputs, history views, navigation, and no persistence.');
