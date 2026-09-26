const { readDraft, saveDraft } = require('../../utils/recap-draft');
const { safeTop } = require('../../utils/layout');
const { formatElapsed } = require('../../utils/time');
const { readActiveRun, saveActiveRun, clearActiveRun } = require('../../utils/active-run');
const { readLanguage, copyFor } = require('../../utils/i18n');

Page({
  data: {
    paused: false,
    safeTop: 96,
    elapsedSeconds: 0,
    elapsedText: '00:00:00',
    language: 'en',
    copy: copyFor('en', 'run')
  },

  onLoad(options) {
    const language = readLanguage();
    this.setData({ safeTop: safeTop(), language, copy: copyFor(language, 'run') });
    this.ended = true;
    try {
      let run = readActiveRun();
      if (!run && options && options.continue === '1') {
        const draft = readDraft();
        if (!draft || !draft.run) return;
        const { startedAt, pausedAt, totalPausedMs, finishedAt } = draft.run;
        // Restore at page entry so all time spent in the form stays excluded.
        run = { startedAt, pausedAt,
          totalPausedMs: totalPausedMs + (pausedAt ? 0 : Date.now() - finishedAt) };
      }
      run = run || {
        startedAt: Number(options && options.startedAt) || Date.now(),
        totalPausedMs: 0,
        pausedAt: 0
      };
      saveActiveRun(run);
      Object.assign(this, run);
      this.ended = false;
      this.setData({ paused: !!this.pausedAt });
      this.updateClock();
    } catch (error) {
      wx.showToast({ title: this.data.copy.restoreError, icon: 'none' });
    }
  },

  onShow() {
    if (!this.data.paused && !this.ended) {
      this.beginTicker();
    }
  },

  onHide() {
    this.clearTicker();
    this.persistRun();
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

  persistRun() {
    if (this.ended) return true;
    try {
      saveActiveRun(this);
      return true;
    } catch (error) {
      return false;
    }
  },

  togglePause() {
    if (this.ended) return;
    const now = Date.now();
    const run = {
      startedAt: this.startedAt,
      totalPausedMs: this.totalPausedMs + (this.pausedAt ? now - this.pausedAt : 0),
      pausedAt: this.pausedAt ? 0 : now
    };
    try {
      saveActiveRun(run);
    } catch (error) {
      wx.showToast({ title: this.data.copy.stateError, icon: 'none' });
      return;
    }
    Object.assign(this, run);
    this.setData({ paused: !!this.pausedAt });
    this.updateClock();
    if (this.data.paused) {
      this.clearTicker();
    } else {
      this.beginTicker();
    }
  },

  finish() {
    if (this.navigating || this.ended) return;
    const finishedAt = Date.now();
    const elapsedSeconds = this.elapsedAt(finishedAt);
    try {
      const previous = readDraft();
      const draft = previous && previous.run && previous.run.startedAt === this.startedAt
        ? previous
        : { id: `draft-${finishedAt}-${Math.random().toString(36).slice(2)}`,
          weather: '', mood: '', selectedNotices: {}, distance: '', note: '' };
      saveDraft({ ...draft, durationSeconds: elapsedSeconds,
        distance: draft.distance || '',
        run: { startedAt: this.startedAt, pausedAt: this.pausedAt,
          totalPausedMs: this.totalPausedMs, finishedAt } });
      clearActiveRun();
    } catch (error) {
      wx.showToast({ title: this.data.copy.finishError, icon: 'none' });
      return;
    }
    this.navigating = true;
    this.updateClock();
    this.ended = true;
    this.clearTicker();
    wx.redirectTo({
      url: `/pages/recap/recap?durationSeconds=${elapsedSeconds}`,
      fail: () => {
        try {
          saveActiveRun(this);
        } catch (error) {
          wx.showToast({ title: this.data.copy.stateError, icon: 'none' });
        }
        this.ended = false;
        if (!this.data.paused) {
          this.beginTicker();
        }
      },
      complete: () => { this.navigating = false; }
    });
  }
});
