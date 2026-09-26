const { safeTop } = require('../../utils/layout');
const { readActiveRun } = require('../../utils/active-run');
Page({
  data: { safeTop: 96, hasActiveRun: false },
  onLoad() { this.setData({ safeTop: safeTop() }); },
  onShow() {
    try {
      this.setData({ hasActiveRun: !!readActiveRun() });
    } catch (error) {
      wx.showToast({ title: '未能读取本机跑步', icon: 'none' });
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
    try {
      activeRun = readActiveRun();
    } catch (error) {
      wx.showToast({ title: '未能读取本机跑步', icon: 'none' });
      return;
    }
    this.navigating = true;
    const startedAt = activeRun ? activeRun.startedAt : Date.now();
    wx.navigateTo({
      url: `/pages/run/run?startedAt=${startedAt}`,
      complete: () => { this.navigating = false; }
    });
  }
});
