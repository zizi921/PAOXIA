const { readDraft, saveDraft } = require('../../utils/recap-draft');
const { safeTop } = require('../../utils/layout');
const { formatElapsed } = require('../../utils/time');
const { distanceBetween, formatDistanceMeters } = require('../../utils/distance');
const { readActiveRun, saveActiveRun, clearActiveRun } = require('../../utils/active-run');
const { readLanguage, copyFor } = require('../../utils/i18n');

Page({
  data: {
    paused: false,
    safeTop: 96,
    elapsedSeconds: 0,
    elapsedText: '00:00:00',
    distanceText: '0.00 km',
    locationStatus: 'Finding GPS…',
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
        const { startedAt, pausedAt, totalPausedMs, finishedAt, distanceMeters } = draft.run;
        // Restore at page entry so all time spent in the form stays excluded.
        run = { startedAt, pausedAt,
          totalPausedMs: totalPausedMs + (pausedAt ? 0 : Date.now() - finishedAt),
          distanceMeters: Math.max(0, Number(distanceMeters) || 0), lastLocation: null };
      }
      run = run || {
        startedAt: Number(options && options.startedAt) || Date.now(),
        totalPausedMs: 0,
        pausedAt: 0,
        distanceMeters: 0,
        lastLocation: null
      };
      saveActiveRun(run);
      Object.assign(this, run);
      this.ended = false;
      this.setData({ paused: !!this.pausedAt,
        distanceText: `${formatDistanceMeters(this.distanceMeters)} km` });
      this.setLocationStatus(this.pausedAt ? 'distancePaused' : 'findingGps');
      this.updateClock();
    } catch (error) {
      wx.showToast({ title: this.data.copy.restoreError, icon: 'none' });
    }
  },

  onShow() {
    if (!this.data.paused && !this.ended) {
      this.beginTicker();
      this.startLocationTracking();
    }
  },

  onHide() {
    this.clearTicker();
    this.persistRun();
  },

  onUnload() {
    this.clearTicker();
    this.stopLocationTracking();
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

  setLocationStatus(key) {
    this.locationStatusKey = key;
    this.setData({ locationStatus: this.data.copy[key] || '' });
  },

  startLocationTracking() {
    if (this.locationStarting || this.locationActive || this.data.paused || this.ended) return;
    if (typeof wx.onLocationChange !== 'function') {
      this.setLocationStatus('gpsNeeded');
      return;
    }
    this.locationStarting = true;
    if (!this.locationHandler) this.locationHandler = location => this.handleLocation(location);
    if (!this.locationListenerAttached) {
      wx.onLocationChange(this.locationHandler);
      this.locationListenerAttached = true;
    }
    const succeeded = () => {
      this.locationStarting = false;
      this.locationActive = true;
      this.setLocationStatus('gpsOn');
    };
    const failed = () => {
      if (typeof wx.startLocationUpdate === 'function' && !this.foregroundLocationAttempted) {
        this.foregroundLocationAttempted = true;
        wx.startLocationUpdate({ type: 'gcj02', success: succeeded, fail: () => this.locationFailed() });
        return;
      }
      this.locationFailed();
    };
    if (typeof wx.startLocationUpdateBackground === 'function') {
      wx.startLocationUpdateBackground({ type: 'gcj02', success: succeeded, fail: failed });
    } else if (typeof wx.startLocationUpdate === 'function') {
      this.foregroundLocationAttempted = true;
      wx.startLocationUpdate({ type: 'gcj02', success: succeeded, fail: () => this.locationFailed() });
    } else {
      this.locationFailed();
    }
  },

  locationFailed() {
    this.locationStarting = false;
    this.locationActive = false;
    this.foregroundLocationAttempted = false;
    this.setLocationStatus('allowLocation');
  },

  stopLocationTracking() {
    if (this.locationListenerAttached && typeof wx.offLocationChange === 'function') {
      wx.offLocationChange(this.locationHandler);
    }
    this.locationListenerAttached = false;
    this.locationStarting = false;
    this.locationActive = false;
    this.foregroundLocationAttempted = false;
    if (typeof wx.stopLocationUpdate === 'function') wx.stopLocationUpdate({});
  },

  handleLocation(location) {
    if (this.ended || this.data.paused) return;
    const latitude = Number(location && location.latitude);
    const longitude = Number(location && location.longitude);
    const accuracyValue = Number(location && (location.accuracy || location.horizontalAccuracy));
    const accuracy = Number.isFinite(accuracyValue) && accuracyValue > 0 ? accuracyValue : 30;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || accuracy > 80) return;
    const point = { latitude, longitude, accuracy, at: Date.now() };
    if (!this.lastLocation) {
      this.lastLocation = point;
      this.persistRun();
      return;
    }
    const segmentMeters = distanceBetween(this.lastLocation, point);
    const seconds = Math.max(1, (point.at - this.lastLocation.at) / 1000);
    const jitterThreshold = Math.max(3,
      Math.min(10, ((this.lastLocation.accuracy || 30) + accuracy) / 4));
    if (segmentMeters < jitterThreshold) return;
    if (segmentMeters / seconds > 12) return;
    this.distanceMeters += segmentMeters;
    this.lastLocation = point;
    this.setData({ distanceText: `${formatDistanceMeters(this.distanceMeters)} km` });
    this.setLocationStatus('gpsOn');
    this.persistRun();
  },

  togglePause() {
    if (this.ended) return;
    const now = Date.now();
    const run = {
      startedAt: this.startedAt,
      totalPausedMs: this.totalPausedMs + (this.pausedAt ? now - this.pausedAt : 0),
      pausedAt: this.pausedAt ? 0 : now,
      distanceMeters: this.distanceMeters,
      lastLocation: null
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
      this.stopLocationTracking();
      this.setLocationStatus('distancePaused');
    } else {
      this.beginTicker();
      this.startLocationTracking();
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
        distance: this.distanceMeters > 0
          ? formatDistanceMeters(this.distanceMeters)
          : (draft.distance || formatDistanceMeters(0)),
        run: { startedAt: this.startedAt, pausedAt: this.pausedAt,
          totalPausedMs: this.totalPausedMs, finishedAt,
          distanceMeters: this.distanceMeters, lastLocation: this.lastLocation } });
      clearActiveRun();
    } catch (error) {
      wx.showToast({ title: this.data.copy.finishError, icon: 'none' });
      return;
    }
    this.navigating = true;
    this.updateClock();
    this.ended = true;
    this.clearTicker();
    this.stopLocationTracking();
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
          this.startLocationTracking();
        }
      },
      complete: () => { this.navigating = false; }
    });
  }
});
