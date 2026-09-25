const { safeTop } = require('../../utils/layout');

// UI-only form state. Nothing is persisted or sent over the network.
Page({
  data: {
    safeTop: 96,
    mood: 'calm',
    notice: 'cat',
    distance: '',
    note: ''
  },

  onLoad() {
    this.setData({ safeTop: safeTop() });
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
    wx.reLaunch({
      url: '/pages/home/home',
      complete: () => { this.navigating = false; }
    });
  }
});
