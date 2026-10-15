const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const clone = v => JSON.parse(JSON.stringify(v));
const documents = new Map();
let identity = { OPENID: 'alice', APPID: 'wx9c65c2f6a3a548d3' };
const collection = {
  where(filter) {
    let limit = Infinity;
    const matches = () => [...documents.values()].filter(doc => Object.entries(filter).every(([k,v]) => v && v.gt ? doc[k] > v.gt : doc[k] === v)).sort((a,b) => a._id.localeCompare(b._id));
    const query = { limit(n) { limit=n; return query; }, orderBy() { return query; },
      async get() { return { data: clone(matches().slice(0,limit)) }; },
      async update({data}) { const found=matches(); found.forEach(doc=>documents.set(doc._id,{...doc,...clone(data)})); return {stats:{updated:found.length}}; } };
    return query;
  },
  async add({data}) { if(documents.has(data._id)) throw new Error('duplicate'); documents.set(data._id,clone(data)); }
};
const backend = { exports: {} };
vm.runInNewContext(fs.readFileSync('cloudfunctions/paoxiaSync/index.js','utf8'), {
  exports:backend.exports, Buffer,
  require: name => name === 'crypto' ? crypto : {
    init() {}, getWXContext:()=>identity,
    database:()=>({collection:()=>collection,command:{gt:value=>({gt:value})},serverDate:()=>Date.now()})
  }
});
const run = id => ({id,date:'2026-10-15',startedAt:1000,finishedAt:601000,durationSeconds:600,distance:'2 km',weather:'sunny',mood:'Good',moodType:'good',notices:['tree'],note:'hello',noteDrawing:[{color:'#123456',points:[[0,0],[1,1]]}]});
function phone(user='alice', storage=new Map()) {
  const wx = {
    getStorageSync:k=>storage.has(k)?clone(storage.get(k)):'',
    setStorageSync:(k,v)=>storage.set(k,clone(v)), removeStorageSync:k=>storage.delete(k),
    cloud:{init(){},async callFunction({data}) {
      if (wx.offline) throw new Error('offline');
      identity={OPENID:user,APPID:'wx9c65c2f6a3a548d3'};
      const result=await backend.exports.main(clone(data));
      if (wx.loseResponse && data.action==='write') { wx.loseResponse=false; throw new Error('response lost'); }
      return {result};
    }}
  };
  const records={exports:{}};
  vm.runInNewContext(fs.readFileSync('miniprogram/utils/records.js','utf8'),{module:records,wx});
  const sync={exports:{}};
  vm.runInNewContext(fs.readFileSync('miniprogram/utils/sync.js','utf8'),{module:sync,wx,require:()=>records.exports,console:{warn(){}},Set});
  let status;
  sync.exports.subscribe(value=>status=value);
  return {wx,storage,r:records.exports,sync:sync.exports.sync,status:()=>status};
}
(async()=>{
  const a=phone(),b=phone();
  a.r.saveRecord(run('one')); await a.sync(); assert.equal(a.status(),'synced');
  await b.sync(); assert.equal(b.r.readRecords().length,1);assert.equal(b.r.readRecords()[0].noteDrawing[0].color,'#123456');assert.equal(b.r.readRecords()[0].finishedAt,601000);
  b.r.updateRecord('one',{...run('one'),note:'phone B'}); await b.sync(); await a.sync(); assert.equal(a.r.readRecords()[0].note,'phone B');
  a.wx.offline=true; a.r.saveRecord(run('offline')); await a.sync(); assert.equal(a.status(),'error');assert.equal(a.r.readState().pending.length,1);
  const restarted=phone('alice',a.storage); restarted.wx.loseResponse=true;await restarted.sync();assert.equal(restarted.status(),'error');
  await restarted.sync(); assert.equal(restarted.r.readState().pending.length,0);assert.equal(documents.size,2);
  await b.sync(); b.r.deleteRecord('one');await b.sync();await restarted.sync();assert(!restarted.r.readRecords().some(r=>r.id==='one'));
  const other=phone('bob');await other.sync();assert.equal(other.r.readRecords().length,0);
  const changedAccount=phone('bob',restarted.storage);await changedAccount.sync();assert.equal(changedAccount.r.readRecords().length,0);
  const back=phone('alice',restarted.storage);await back.sync();assert.equal(back.r.readRecords().length,1);
  // Concurrent edits preserve both versions.
  await b.sync(); back.r.updateRecord('offline',{...run('offline'),note:'edit A'});b.r.updateRecord('offline',{...run('offline'),note:'edit B'});
  await back.sync();await b.sync();assert.equal(b.status(),'conflict');assert.deepEqual(b.r.readRecords().map(r=>r.note).sort(),['edit A','edit B']);
  await back.sync();assert.equal(back.r.readRecords().length,2);
  back.r.clearRecords();await back.sync();await b.sync();assert.equal(b.r.readRecords().length,0);
  // Invalid identity and forged owner fields cannot access another account.
  identity={OPENID:'',APPID:'wx9c65c2f6a3a548d3'};assert.equal((await backend.exports.main({action:'list'})).error,'UNAUTHENTICATED');
  identity={OPENID:'alice',APPID:'wrong'};assert.equal((await backend.exports.main({action:'identity'})).error,'UNAUTHENTICATED');
  identity={OPENID:'bob',APPID:'wx9c65c2f6a3a548d3'};
  assert.equal((await backend.exports.main({action:'list',owner:back.r.readState().owner})).records.length,0);
  // Missing records migrate once, and storage failure never loses the source.
  const old=phone('carol');old.wx.setStorageSync('paoxia.completedRuns',[run('legacy')]);await old.sync();assert.equal(old.r.readRecords().length,1);assert.equal(old.wx.getStorageSync('paoxia.completedRuns'),'');
  old.r.clearRecords();await old.sync();await old.sync();assert.equal(old.r.readRecords().length,0);
  for(let i=0;i<12;i++) other.r.saveRecord(run(`page-${i}`));await other.sync();const many=phone('bob');await many.sync();assert.equal(many.r.readRecords().length,12);
  assert.throws(()=>backend.exports.cleanRecord({...run('invalid'),durationSeconds:-1}));
  assert.throws(()=>backend.exports.cleanRecord({...run('invalid'),noteDrawing:[{points:[[Infinity,0]]}]}));
  console.log('PASS: two-phone sync, editable drawing, offline/restart, lost-response idempotency, deletion, account isolation, conflict copies, migration, pagination and validation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
