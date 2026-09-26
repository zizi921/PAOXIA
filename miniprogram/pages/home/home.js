const { safeTop } = require('../../utils/layout');
const { readActiveRun } = require('../../utils/active-run');
const { readDraft } = require('../../utils/recap-draft');
Page({
  data: { safeTop: 96, hasActiveRun: false, hasDraft: false },
  onLoad() { this.setData({ safeTop: safeTop() }); },
  onShow() {
    try {
      this.setData({ hasActiveRun: !!readActiveRun(), hasDraft: !!readDraft() });
    } catch (error) {
      wx.showToast({ title: 'Could not load your run or draft.', icon: 'none' });
    }
  },
  openHistory() {
    if (this.navigating) return;
    this.navigating = true;
    wx.navigateTo({
      url: '/pages/history/history',
      complete: () => { this.navigating = false; }
    });
  },
  go() {
    if (this.navigating) return;
    let activeRun;
    let draft;
    try {
      activeRun = readActiveRun();
      draft = readDraft();
    } catch (error) {
      wx.showToast({ title: 'Could not load your run or draft.', icon: 'none' });
      return;
    }
    this.navigating = true;
    const startedAt = activeRun ? activeRun.startedAt : Date.now();
    wx.navigateTo({
      url: !activeRun && draft ? '/pages/recap/recap' : `/pages/run/run?startedAt=${startedAt}`,
      complete: () => { this.navigating = false; }
    });
  }
});
