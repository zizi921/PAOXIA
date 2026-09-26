const { safeTop } = require('../../utils/layout');
const { formatDuration } = require('../../utils/time');

// UI-only form state. Nothing is persisted or sent over the network.
Page({
  data: {
    safeTop: 96,
    durationSeconds: 0,
    durationText: '0 sec',
    weather: '',
    weatherLabel: 'Not selected',
    weatherGlyph: '＋',
    weatherOpen: false,
    weatherOptions: [
      { value: 'sunny', label: 'Sunny', glyph: '☀︎' },
      { value: 'cloudy', label: 'Cloudy', glyph: '☁︎' },
      { value: 'rainy', label: 'Rainy', glyph: '☂︎' },
      { value: 'windy', label: 'Windy', glyph: '≋' }
    ],
    mood: '',
    selectedNotices: {},
    distance: '',
    note: ''
  },

  onLoad(options) {
    const durationSeconds = Number(options && options.durationSeconds) || 0;
    this.setData({
      safeTop: safeTop(),
      durationSeconds,
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
    if (this.data.weather === weather) {
      this.setData({ weather: '', weatherLabel: 'Not selected', weatherGlyph: '＋', weatherOpen: false });
      return;
    }
    this.setData({
      weather,
      weatherLabel: selected.label,
      weatherGlyph: selected.glyph,
      weatherOpen: false
    });
  },

  chooseNotice(event) {
    const notice = event.currentTarget.dataset.value;
    const selectedNotices = { ...this.data.selectedNotices };
    if (selectedNotices[notice]) {
      delete selectedNotices[notice];
    } else if (notice === 'nothing') {
      this.setData({ selectedNotices: { nothing: true } });
      return;
    } else {
      delete selectedNotices.nothing;
      selectedNotices[notice] = true;
    }
    this.setData({ selectedNotices });
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
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const moodLabels = { good: 'Good', calm: 'Calm', tired: 'Tired', unsure: 'Not sure' };
    const app = getApp();
    app.globalData.latestRun = {
      id: `run-${Date.now()}`,
      date,
      durationSeconds: this.data.durationSeconds,
      distance: this.data.distance ? `${this.data.distance} km` : '— km',
      mood: moodLabels[this.data.mood] || 'Not set',
      moodType: this.data.mood || 'unsure',
      notices: Object.keys(this.data.selectedNotices),
      note: this.data.note,
      weather: this.data.weather
    };
    wx.redirectTo({
      url: '/pages/history/history',
      complete: () => { this.navigating = false; }
    });
  }
});
