const { createRouteTrace } = require('../../utils/route-shape');
const { createRunLocation } = require('../../utils/run-location');
const { readDraft, saveDraft } = require('../../utils/recap-draft');
const { safeTop } = require('../../utils/layout');
const { formatElapsed } = require('../../utils/time');
const { readActiveRun, saveActiveRun, clearActiveRun } = require('../../utils/active-run');
const { readLanguage, copyFor } = require('../../utils/i18n');
const { shareAppMessage, showShareMenu } = require('../../utils/share');

Page({
  onShareAppMessage: shareAppMessage,
  data: {
    paused: false,
    distanceText: '0.00',
    gpsStatus: 'locating',
    distanceIncomplete: false,
    safeTop: 96,
    elapsedSeconds: 0,
    elapsedText: '00:00:00',
    language: 'en',
    copy: copyFor('en', 'run')
  },

  onLoad(options) {
    const language = readLanguage();
    const initialData = { safeTop: safeTop(), language, copy: copyFor(language, 'run') };
    this.ended = true;
    try {
      let run = readActiveRun();
      // A process restart leaves an unmeasured interval; do not invent its distance.
      if (run && !run.pausedAt) run.distanceIncomplete = true;
      if (!run && options && options.continue === '1') {
        const draft = readDraft();
        if (!draft || !draft.run) { this.setData(initialData); return; }
        const { startedAt, pausedAt, totalPausedMs, finishedAt } = draft.run;
        // Restore at page entry so all time spent in the form stays excluded.
        run = { startedAt, pausedAt, routeTrace: draft.run.routeTrace || null, distanceMeters: Number.isFinite(draft.run.distanceMeters) && draft.run.distanceMeters >= 0 ? draft.run.distanceMeters : 0,
          distanceIncomplete: !!draft.run.distanceIncomplete,
          totalPausedMs: totalPausedMs + (pausedAt ? 0 : Date.now() - finishedAt) };
      }
      run = run || {
        startedAt: Number(options && options.startedAt) || Date.now(),
        totalPausedMs: 0,
        pausedAt: 0
      };
      saveActiveRun(run);
      Object.assign(this, { distanceMeters: 0, distanceIncomplete: false }, run);
      this.trace = createRouteTrace(this.routeTrace);
      this.location = createRunLocation({
        onPoint: (point, newSegment) => {
          if (!this.ended && !this.pausedAt) {
            this.trace.add(point, newSegment);
            this.routeTrace = this.trace.snapshot();
          }
        },
        onDistance: meters => {
          if (this.ended || this.pausedAt) return;
          this.distanceMeters += meters;
          if (!this.persistRun()) this.distanceIncomplete = true;
          this.showDistance();
        },
        onStatus: status => {
          if (this.ended || this.pausedAt) return;
          if (status === 'gap' || status === 'unavailable' || status === 'interrupted') {
            this.distanceIncomplete = true;
            this.persistRun();
          }
          const gpsStatus = status === 'gap' ? 'ready' : status === 'interrupted' ? 'weak' : status;
          if (gpsStatus !== this.data.gpsStatus) this.setData({ gpsStatus });
          this.showDistance();
        }
      });
      this.ended = false;
      const elapsedSeconds = this.elapsedAt(Date.now());
      this.setData({ ...initialData, paused: !!this.pausedAt, elapsedSeconds, elapsedText: formatElapsed(elapsedSeconds),
        distanceText: (this.distanceMeters / 1000).toFixed(2), distanceIncomplete: this.distanceIncomplete });
    } catch (error) {
      this.setData(initialData);
      wx.showToast({ title: this.data.copy.restoreError, icon: 'none' });
    }
  },

  onShow() {
    showShareMenu();
    if (!this.data.paused && !this.ended) {
      this.beginTicker();
      this.location.start();
    }
  },

  onHide() {
    this.clearTicker();
    this.persistRun();
  },

  onUnload() {
    this.clearTicker();
    this.persistRun();
    if (this.location) this.location.stop();
  },

  showDistance() {
    const distanceText = (this.distanceMeters / 1000).toFixed(2);
    if (distanceText !== this.data.distanceText || this.distanceIncomplete !== this.data.distanceIncomplete) {
      this.setData({ distanceText, distanceIncomplete: this.distanceIncomplete });
    }
  },

  retryLocation() {
    if (this.ended || this.pausedAt || !this.location) return;
    wx.openSetting({ success: () => {
      if (!this.ended && !this.pausedAt) this.location.stop().then(() => {
        if (!this.ended && !this.pausedAt) this.location.start();
      });
    } });
  },

  elapsedAt(now) {
    const activePauseMs = this.pausedAt ? now - this.pausedAt : 0;
    return Math.max(0, Math.floor((now - this.startedAt - this.totalPausedMs - activePauseMs) / 1000));
  },

  updateClock() {
    if (this.location) this.location.checkSignal();
    const elapsedSeconds = this.elapsedAt(Date.now());
    if (elapsedSeconds !== this.data.elapsedSeconds) {
      this.setData({ elapsedSeconds, elapsedText: formatElapsed(elapsedSeconds) });
    }
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
      routeTrace: this.routeTrace, distanceMeters: this.distanceMeters, distanceIncomplete: this.distanceIncomplete,
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
      this.location.stop();
    } else {
      this.beginTicker();
      this.location.start();
    }
  },

  finishDistance(draft) {
    // Keep any manual correction, and append only newly measured distance on Continue.
    const priorMeters = draft.run && draft.run.distanceMeters || 0;
    const additional = Math.max(0, this.distanceMeters - priorMeters);
    if (draft.distance && Number.isFinite(Number(draft.distance))) {
      return additional ? (Number(draft.distance) + additional / 1000).toFixed(2) : draft.distance;
    }
    return this.distanceMeters > 0 ? (this.distanceMeters / 1000).toFixed(2) : '';
  },

  finish() {
    if (this.navigating || this.ended) return;
    this.location.checkSignal();
    const finishedAt = Date.now();
    const elapsedSeconds = this.elapsedAt(finishedAt);
    try {
      const previous = readDraft();
      const draft = previous && previous.run && previous.run.startedAt === this.startedAt
        ? previous
        : { id: `draft-${finishedAt}-${Math.random().toString(36).slice(2)}`,
          weather: '', mood: '', selectedNotices: {}, distance: '', note: '' };
      saveDraft({ ...draft, durationSeconds: elapsedSeconds,
        distance: this.finishDistance(draft),
        run: { routeTrace: this.trace.snapshot(), distanceMeters: this.distanceMeters, distanceIncomplete: this.distanceIncomplete, startedAt: this.startedAt, pausedAt: this.pausedAt,
          totalPausedMs: this.totalPausedMs, finishedAt } });
      clearActiveRun();
    } catch (error) {
      wx.showToast({ title: this.data.copy.finishError, icon: 'none' });
      return;
    }
    this.navigating = true;
    this.updateClock();
    this.ended = true;
    this.location.stop();
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
          this.location.start();
        }
      },
      complete: () => { this.navigating = false; }
    });
  }
});
