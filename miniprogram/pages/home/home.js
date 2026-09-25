const { safeTop } = require('../../utils/layout');
Page({
  data: { safeTop: 96 },
  onLoad() { this.setData({ safeTop: safeTop() }); },
  go() {
    if (this.navigating) return;
    this.navigating = true;
    wx.navigateTo({ url: '/pages/run/run', complete: () => { this.navigating = false; } });
  }
});
