const { safeTop } = require('../../utils/layout');
const { formatDuration } = require('../../utils/time');
const { readRecords, saveRecord, updateRecord, deleteRecord } = require('../../utils/records');
const { readLanguage, copyFor } = require('../../utils/i18n');
const { shareAppMessage, showShareMenu } = require('../../utils/share');

const { readDraft, saveDraft, clearDraft, clearDraftForRecord } = require('../../utils/recap-draft');

function localDateFor(timestamp) {
  const value = Number(timestamp);
  const date = new Date(Number.isFinite(value) && value > 0 ? value : Date.now());
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
Page({
  onShareAppMessage: shareAppMessage,
  onShow() { showShareMenu(); },
  data: {
    safeTop: 96,
    language: 'en',
    copy: copyFor('en', 'recap'),
    editing: false,
    canContinue: false,
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
    penColor: '#262622',
    penColors: [
      { value: '#262622', label: 'Black' },
      { value: '#3d91d0', label: 'Blue' },
      { value: '#75927b', label: 'Green' },
      { value: '#f5ad22', label: 'Yellow' },
      { value: '#c96358', label: 'Red' },
      { value: '#8b72a5', label: 'Purple' }
    ],
    note: '', noteDrawing: [], noteEditor: false, noteMode: 'text', penTool: 'pen'
  },

  onLoad(options) {
    this.saved = false;
    this.discarded = false;
    this.navigating = false;
    this.draftId = null;
    this.run = null;
    this.editId = options && options.recordId || null;
    this.editRecord = null;
    const language = readLanguage();
    const copy = copyFor(language, 'recap');
    const initialData = {};
    const prepare = update => Object.assign(initialData, update);
    prepare({ editing: !!this.editId, language, copy,
      weatherOptions: this.data.weatherOptions.map(option => ({ ...option, label: copy.weatherOptions[option.value] })) });
    prepare({ canContinue: false });
    prepare({ safeTop: safeTop() });
    if (this.editId) {
      try {
        const record = readRecords().find(item => item.id === this.editId);
        if (!record) throw new Error('Record not found');
        this.editRecord = record;
        const selected = initialData.weatherOptions.find(option => option.value === record.weather);
        const selectedNotices = {};
        (record.notices || []).forEach(value => { selectedNotices[value] = true; });
        prepare({ durationSeconds: record.durationSeconds,
          durationText: formatDuration(record.durationSeconds, language),
          weather: record.weather || '', weatherOpen: false,
          weatherLabel: selected ? selected.label : copy.notSelected,
          weatherGlyph: selected ? selected.glyph : '＋',
          mood: record.mood && record.mood !== 'Not set' ? record.moodType : '',
          selectedNotices, distance: record.distance && record.distance !== '— km' ? String(record.distance).replace(/\s*km$/, '') : '',
          note: record.note || '', noteDrawing: record.noteDrawing || [] });
      } catch (error) {
        wx.showToast({ title: copy.loadRecordError, icon: 'none' });
      }
      this.setData(initialData);
      return;
    }
    let draft;
    try {
      draft = readDraft();
    } catch (error) {
      wx.showToast({ title: copy.loadDraftError, icon: 'none' });
      this.setData(initialData);
      return;
    }
    this.run = draft && draft.run || null;
    prepare({ canContinue: !!this.run });
    this.draftId = draft ? draft.id : `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const durationSeconds = draft ? draft.durationSeconds : Number(options && options.durationSeconds) || 0;
    prepare({ weather: '', weatherLabel: copy.notSelected, weatherGlyph: '＋',
      weatherOpen: false, mood: '', selectedNotices: {}, distance: '', note: '', noteDrawing: [], noteEditor: false, noteMode: 'text', penTool: 'pen' });
    if (draft) {
      const { weather, mood, selectedNotices, distance, note } = draft;
      const selected = initialData.weatherOptions.find(option => option.value === weather);
      prepare({ weather, mood, selectedNotices, distance, note, noteDrawing: draft.noteDrawing || [],
        weatherLabel: selected ? selected.label : copy.notSelected,
        weatherGlyph: selected ? selected.glyph : '＋' });
    }
    prepare({ durationSeconds, durationText: formatDuration(durationSeconds, language) });
    this.setData(initialData);
    this.persistDraft();
  },

  persistDraft() {
    if (this.editId) return false;
    if (!this.draftId || this.saved || this.discarded) return false;
    const { durationSeconds, weather, mood, selectedNotices, distance, note, noteDrawing } = this.data;
    try {
      saveDraft({ id: this.draftId, durationSeconds, weather, mood, selectedNotices, distance, note, noteDrawing, run: this.run });
      return true;
    } catch (error) {
      wx.showToast({ title: this.data.copy.draftError, icon: 'none' });
      return false;
    }
  },

  onHide() { this.persistDraft(); },
  onUnload() { this.persistDraft(); },

  updateForm(update) {
    if ((!this.draftId && !this.editRecord) || this.saved || this.discarded) return;
    this.setData(update);
    this.persistDraft();
  },

  chooseMood(event) {
    const mood = event.currentTarget.dataset.value;
    this.updateForm({ mood: this.data.mood === mood ? '' : mood });
  },

  toggleWeather() {
    if (this.editId) return;
    this.setData({ weatherOpen: !this.data.weatherOpen });
  },

  chooseWeather(event) {
    if (this.editId) return;
    const weather = event.currentTarget.dataset.value;
    const selected = this.data.weatherOptions.find(option => option.value === weather);
    if (!selected) return;
    if (this.data.weather === weather) {
      this.updateForm({ weather: '', weatherLabel: this.data.copy.notSelected, weatherGlyph: '＋', weatherOpen: false });
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

  openNote() { this.setData({ noteEditor: true, weatherOpen: false }); },
  closeNote() { this.setData({ noteEditor: false }); this.persistDraft(); },
  noteMode(event) { this.setData({ noteMode: event.currentTarget.dataset.mode }); },
  selectPen(event) { this.setData({ penTool: event.currentTarget.dataset.tool }); },
  selectColor(event) {
    const color = event.currentTarget.dataset.color;
    if (this.data.penColors.some(item => item.value === color)) this.setData({ penColor: color, penTool: 'pen' });
  },
  updateDrawing(event) { this.updateForm({ noteDrawing: event.detail.strokes }); },
  undoDrawing() { this.updateForm({ noteDrawing: this.data.noteDrawing.slice(0, -1) }); },
  stopScroll() {},

  continueRun() {
    if (this.navigating || this.saved || this.discarded || !this.run) return;
    if (!this.persistDraft()) return;
    this.navigating = true;
    wx.redirectTo({
      url: '/pages/run/run?continue=1',
      fail: () => {
        wx.showToast({ title: this.data.copy.continueError, icon: 'none' });
      },
      complete: () => { this.navigating = false; }
    });
  },

  discard() {
    if (this.editId) return;
    if (this.navigating || this.saved) return;
    this.navigating = true;
    wx.showModal({
      title: this.data.copy.discardTitle,
      content: this.data.copy.discardContent,
      confirmText: this.data.copy.discardConfirm,
      cancelText: this.data.copy.keep,
      success: result => {
        if (!result.confirm) return;
        try {
          clearDraft();
        } catch (error) {
          wx.showToast({ title: this.data.copy.discardError, icon: 'none' });
          return;
        }
        this.discarded = true;
        this.setData({ canContinue: false });
        this.setData({ durationSeconds: 0, durationText: '0 sec', weather: '',
          weatherLabel: this.data.copy.notSelected, weatherGlyph: '＋', weatherOpen: false,
          mood: '', selectedNotices: {}, distance: '', note: '', noteDrawing: [], noteEditor: false, noteMode: 'text', penTool: 'pen' });
        wx.reLaunch({
          url: '/pages/home/home',
          fail: () => {
            // Discard succeeded; keep a usable blank form if navigation fails.
            this.onLoad({});
            wx.showToast({ title: this.data.copy.discardNavError, icon: 'none' });
          }
        });
      },
      complete: () => { this.navigating = false; }
    });
  },

  returnToDetail() {
    this.navigating = true;
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.redirectTo({
          url: `/pages/history/history?recordId=${encodeURIComponent(this.editId)}`,
          fail: () => { wx.showToast({ title: this.data.copy.historyError, icon: 'none' }); },
          complete: () => { this.navigating = false; }
        });
      },
      complete: () => { this.navigating = false; }
    });
  },

  cancelEdit() {
    if (!this.editId || this.navigating) return;
    this.returnToDetail();
  },

  deleteRun() {
    if (!this.editId || !this.editRecord || this.navigating) return;
    this.navigating = true;
    wx.showModal({
      title: this.data.copy.deleteTitle,
      content: this.data.copy.deleteContent,
      confirmText: this.data.copy.deleteConfirm,
      confirmColor: '#a65445',
      cancelText: this.data.copy.cancel,
      success: result => {
        if (!result.confirm) return;
        try {
          clearDraftForRecord(this.editId);
          deleteRecord(this.editId);
        } catch (error) {
          wx.showToast({ title: this.data.copy.deleteError, icon: 'none' });
          return;
        }
        this.discarded = true;
        this.editRecord = null;
        wx.navigateBack({
          delta: 1,
          fail: () => {
            wx.redirectTo({
              url: '/pages/history/history',
              fail: () => { wx.showToast({ title: this.data.copy.deleteNavError, icon: 'none' }); },
              complete: () => { this.navigating = false; }
            });
          },
          complete: () => { this.navigating = false; }
        });
      },
      complete: () => {
        if (!this.discarded) this.navigating = false;
      }
    });
  },

  saveEdit() {
    if (!this.editRecord) return;
    const moodLabels = { good: 'Good', calm: 'Calm', tired: 'Tired', unsure: 'Not sure' };
    try {
      if (!this.saved) {
        updateRecord(this.editId, {
          distance: this.data.distance ? `${this.data.distance} km` : '— km',
          mood: moodLabels[this.data.mood] || 'Not set',
          moodType: this.data.mood || 'unsure',
          notices: Object.keys(this.data.selectedNotices), note: this.data.note, noteDrawing: this.data.noteDrawing
        });
        this.saved = true;
      }
    } catch (error) {
      wx.showToast({ title: this.data.copy.saveChangesError, icon: 'none' });
      return;
    }
    this.returnToDetail();
  },

  save() {
    if (this.navigating) return;
    if (this.editId) { this.saveEdit(); return; }
    // DevTools hot reload can retain the page without running the new onLoad.
    if (!this.draftId || this.discarded) this.onLoad({ durationSeconds: this.data.durationSeconds });
    if (!this.draftId) return;
    this.navigating = true;
    const startedAt = this.run && Number.isFinite(this.run.startedAt) ? this.run.startedAt : 0;
    const finishedAt = this.run && Number.isFinite(this.run.finishedAt) ? this.run.finishedAt : Date.now();
    const date = localDateFor(finishedAt || startedAt);
    const moodLabels = { good: 'Good', calm: 'Calm', tired: 'Tired', unsure: 'Not sure' };
    const record = {
      id: this.draftId,
      date,
      startedAt,
      finishedAt,
      durationSeconds: this.data.durationSeconds,
      distance: this.data.distance ? `${this.data.distance} km` : '— km',
      mood: moodLabels[this.data.mood] || 'Not set',
      moodType: this.data.mood || 'unsure',
      notices: Object.keys(this.data.selectedNotices),
      note: this.data.note, noteDrawing: this.data.noteDrawing,
      weather: this.data.weather
    };
    try {
      if (!this.saved) {
        saveRecord(record);
        this.saved = true;
      }
    } catch (error) {
      this.navigating = false;
      wx.showToast({ title: this.data.copy.saveError, icon: 'none' });
      return;
    }
    try {
      clearDraft();
    } catch (error) {
      wx.showToast({ title: this.data.copy.cleanupError, icon: 'none' });
    }
    wx.redirectTo({
      url: '/pages/history/history',
      fail: () => {
        // The record is already saved. Only update this page if navigation
        // fails, so a successful save does not flash a rearranged action row.
        this.setData({ canContinue: false });
        wx.showToast({ title: this.data.copy.savedNavError, icon: 'none' });
      },
      complete: () => { this.navigating = false; }
    });
  }
});
