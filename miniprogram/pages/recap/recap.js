const { safeTop } = require('../../utils/layout');
const { formatDuration } = require('../../utils/time');

// UI-only form state. Nothing is persisted or sent over the network.
Page({
  data: {
    safeTop: 96,
    durationText: '0 sec',
    weather: 'sunny',
    weatherLabel: 'Sunny',
    weatherGlyph: '☀︎',
    weatherOpen: false,
    weatherOptions: [
      { value: 'sunny', label: 'Sunny', glyph: '☀︎' },
      { value: 'cloudy', label: 'Cloudy', glyph: '☁︎' },
      { value: 'rainy', label: 'Rainy', glyph: '☂︎' },
      { value: 'windy', label: 'Windy', glyph: '≋' }
    ],
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

  toggleWeather() {
    this.setData({ weatherOpen: !this.data.weatherOpen });
  },

  chooseWeather(event) {
    const weather = event.currentTarget.dataset.value;
    const selected = this.data.weatherOptions.find(option => option.value === weather);
    if (!selected) return;
    this.setData({
      weather,
      weatherLabel: selected.label,
      weatherGlyph: selected.glyph,
      weatherOpen: false
    });
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
