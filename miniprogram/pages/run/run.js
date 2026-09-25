const { safeTop } = require('../../utils/layout');
const { formatElapsed } = require('../../utils/time');

Page({
  data: {
    paused: false,
    safeTop: 96,
    elapsedSeconds: 0,
    elapsedText: '00:00:00'
  },

  onLoad(options) {
    this.startedAt = Number(options && options.startedAt) || Date.now();
    this.totalPausedMs = 0;
    this.pausedAt = 0;
    this.ended = false;
    this.setData({ safeTop: safeTop() });
  },

  onShow() {
    if (!this.data.paused && !this.ended) this.beginTicker();
  },

  onHide() {
    this.clearTicker();
  },

  onUnload() {
    this.clearTicker();
  },

  elapsedAt(now) {
    const activePauseMs = this.pausedAt ? now - this.pausedAt : 0;
    return Math.max(0, Math.floor((now - this.startedAt - this.totalPausedMs - activePauseMs) / 1000));
  },

  updateClock() {
    const elapsedSeconds = this.elapsedAt(Date.now());
    this.setData({ elapsedSeconds, elapsedText: formatElapsed(elapsedSeconds) });
    return elapsedSeconds;
  },

  beginTicker() {
    this.clearTicker();
    this.updateClock();
    this.timer = setInterval(() => this.updateClock(), 1000);
  },

  clearTicker() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },

  togglePause() {
    if (this.data.paused) {
      this.totalPausedMs += Date.now() - this.pausedAt;
      this.pausedAt = 0;
      this.setData({ paused: false });
      this.beginTicker();
      return;
    }

    this.updateClock();
    this.pausedAt = Date.now();
    this.clearTicker();
    this.setData({ paused: true });
  },

  finish() {
    if (this.navigating) return;
    this.navigating = true;
    const elapsedSeconds = this.updateClock();
    this.ended = true;
    this.clearTicker();
    wx.navigateTo({
      url: `/pages/recap/recap?durationSeconds=${elapsedSeconds}`,
      complete: () => { this.navigating = false; }
    });
  }
});
