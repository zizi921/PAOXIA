const { safeTop } = require('../../utils/layout');
const { formatDuration } = require('../../utils/time');
const { saveRecord } = require('../../utils/records');

const { readDraft, saveDraft, clearDraft } = require('../../utils/recap-draft');
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
    this.saved = false;
    this.discarded = false;
    this.navigating = false;
    this.draftId = null;
    this.setData({ safeTop: safeTop() });
    let draft;
    try {
      draft = readDraft();
    } catch (error) {
      wx.showToast({ title: 'Could not load draft. Reopen this page.', icon: 'none' });
      return;
    }
    this.draftId = draft ? draft.id : `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const durationSeconds = draft ? draft.durationSeconds : Number(options && options.durationSeconds) || 0;
    this.setData({ weather: '', weatherLabel: 'Not selected', weatherGlyph: '＋',
      weatherOpen: false, mood: '', selectedNotices: {}, distance: '', note: '' });
    if (draft) {
      const { weather, mood, selectedNotices, distance, note } = draft;
      const selected = this.data.weatherOptions.find(option => option.value === weather);
      this.setData({ weather, mood, selectedNotices, distance, note,
        weatherLabel: selected ? selected.label : 'Not selected',
        weatherGlyph: selected ? selected.glyph : '＋' });
    }
    this.setData({ durationSeconds, durationText: formatDuration(durationSeconds) });
    this.persistDraft();
  },

  persistDraft() {
    if (!this.draftId || this.saved || this.discarded) return;
    const { durationSeconds, weather, mood, selectedNotices, distance, note } = this.data;
    try {
      saveDraft({ id: this.draftId, durationSeconds, weather, mood, selectedNotices, distance, note });
    } catch (error) {
      wx.showToast({ title: 'Could not save draft. Try again.', icon: 'none' });
    }
  },

  onHide() { this.persistDraft(); },
  onUnload() { this.persistDraft(); },

  updateForm(update) {
    if (!this.draftId || this.saved || this.discarded) return;
    this.setData(update);
    this.persistDraft();
  },

  chooseMood(event) {
    const mood = event.currentTarget.dataset.value;
    this.updateForm({ mood: this.data.mood === mood ? '' : mood });
  },

  toggleWeather() {
    this.setData({ weatherOpen: !this.data.weatherOpen });
  },

  chooseWeather(event) {
    const weather = event.currentTarget.dataset.value;
    const selected = this.data.weatherOptions.find(option => option.value === weather);
    if (!selected) return;
    if (this.data.weather === weather) {
      this.updateForm({ weather: '', weatherLabel: 'Not selected', weatherGlyph: '＋', weatherOpen: false });
      return;
    }
    this.updateForm({
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
      this.updateForm({ selectedNotices: { nothing: true } });
      return;
    } else {
      delete selectedNotices.nothing;
      selectedNotices[notice] = true;
    }
    this.updateForm({ selectedNotices });
  },

  updateDistance(event) {
    this.updateForm({ distance: event.detail.value });
  },

  updateNote(event) {
    this.updateForm({ note: event.detail.value });
  },

  discard() {
    if (this.navigating || this.saved) return;
    this.navigating = true;
    wx.showModal({
      title: 'Discard draft?',
      content: 'Your time and notes will be deleted. This run will not be saved.',
      confirmText: 'Discard',
      cancelText: 'Keep',
      success: result => {
        if (!result.confirm) return;
        try {
          clearDraft();
        } catch (error) {
          wx.showToast({ title: 'Could not discard draft. Try again.', icon: 'none' });
          return;
        }
        this.discarded = true;
        this.setData({ durationSeconds: 0, durationText: '0 sec', weather: '',
          weatherLabel: 'Not selected', weatherGlyph: '＋', weatherOpen: false,
          mood: '', selectedNotices: {}, distance: '', note: '' });
        wx.reLaunch({
          url: '/pages/home/home',
          fail: () => {
            // Discard succeeded; keep a usable blank form if navigation fails.
            this.onLoad({});
            wx.showToast({ title: 'Draft discarded. Could not open home.', icon: 'none' });
          }
        });
      },
      complete: () => { this.navigating = false; }
    });
  },

  save() {
    if (this.navigating) return;
    // DevTools hot reload can retain the page without running the new onLoad.
    if (!this.draftId || this.discarded) this.onLoad({ durationSeconds: this.data.durationSeconds });
    if (!this.draftId) return;
    this.navigating = true;
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const moodLabels = { good: 'Good', calm: 'Calm', tired: 'Tired', unsure: 'Not sure' };
    const record = {
      id: this.draftId,
      date,
      durationSeconds: this.data.durationSeconds,
      distance: this.data.distance ? `${this.data.distance} km` : '— km',
      mood: moodLabels[this.data.mood] || 'Not set',
      moodType: this.data.mood || 'unsure',
      notices: Object.keys(this.data.selectedNotices),
      note: this.data.note,
      weather: this.data.weather
    };
    try {
      if (!this.saved) {
        saveRecord(record);
        this.saved = true;
      }
    } catch (error) {
      this.navigating = false;
      wx.showToast({ title: 'Could not save this run. Try again.', icon: 'none' });
      return;
    }
    try {
      clearDraft();
    } catch (error) {
      wx.showToast({ title: 'Run saved. Draft cleanup failed.', icon: 'none' });
    }
    wx.redirectTo({
      url: '/pages/history/history',
      fail: () => { wx.showToast({ title: 'Run saved. Tap Save to open history.', icon: 'none' }); },
      complete: () => { this.navigating = false; }
    });
  }
});
