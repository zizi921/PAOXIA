const { safeTop } = require('../../utils/layout');
Page({
  data: { safeTop: 96 },
  onLoad() { this.setData({ safeTop: safeTop() }); },
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
