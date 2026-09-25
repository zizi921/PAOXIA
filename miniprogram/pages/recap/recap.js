const { safeTop } = require('../../utils/layout');
const { formatDuration } = require('../../utils/time');

// UI-only form state. Nothing is persisted or sent over the network.
Page({
  data: {
    safeTop: 96,
    durationText: '0 sec',
    mood: 'calm',
    notice: 'cat',
    distance: '',
    note: ''
  },

  onLoad(options) {
    const durationSeconds = Number(options && options.durationSeconds) || 0;
    this.setData({
      safeTop: safeTop(),
      durationText: formatDuration(durationSeconds)
    });
  },

  chooseMood(event) {
    const mood = event.currentTarget.dataset.value;
    this.setData({ mood: this.data.mood === mood ? '' : mood });
  },

  chooseNotice(event) {
    const notice = event.currentTarget.dataset.value;
    this.setData({ notice: this.data.notice === notice ? '' : notice });
  },

  updateDistance(event) {
    this.setData({ distance: event.detail.value });
  },

  updateNote(event) {
    this.setData({ note: event.detail.value });
  },

  save() {
    if (this.navigating) return;
    this.navigating = true;
    wx.redirectTo({
      url: '/pages/history/history',
      complete: () => { this.navigating = false; }
    });
  }
});
