const { safeTop } = require('../../utils/layout');
Page({
  data: { safeTop: 96 },
  onLoad() { this.setData({ safeTop: safeTop() }); },
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
    this.navigating = true;
    const startedAt = Date.now();
    wx.navigateTo({
      url: `/pages/run/run?startedAt=${startedAt}`,
      complete: () => { this.navigating = false; }
    });
  }
});
