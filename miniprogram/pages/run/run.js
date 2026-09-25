const { safeTop } = require('../../utils/layout');
// UI-only demonstration. No timer, persistence, account, or network requests.
Page({
  data: { paused: false, safeTop: 96 },
  onLoad() { this.setData({ safeTop: safeTop() }); },
  togglePause() { this.setData({ paused: !this.data.paused }); },
  finish() {
    if (this.navigating) return;
    this.navigating = true;
    wx.navigateTo({
      url: '/pages/recap/recap',
      complete: () => { this.navigating = false; }
    });
  }
});
