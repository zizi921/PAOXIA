// Coordinates stay in memory. The page persists meters and relative outline offsets, never the geographic origin.
function metersBetween(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

function createDistanceFilter() {
  let anchor = null;
  let lastFix = null;
  return {
    reset() { anchor = null; lastFix = null; },
    add(location, now) {
      const { latitude, longitude, accuracy } = location;
      if (![latitude, longitude, accuracy, now].every(Number.isFinite) || Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180 || accuracy < 0 || accuracy > 30) return { meters: 0, status: 'weak' };
      if (lastFix && now <= lastFix.time) return { meters: 0, status: 'weak' };
      const gap = lastFix && now - lastFix.time > 30000;
      const point = { latitude, longitude, accuracy, time: now };
      if (!anchor || gap) {
        anchor = point;
        lastFix = point;
        return { meters: 0, status: gap ? 'gap' : 'ready', point, newSegment: true };
      }
      const meters = metersBetween(anchor, point);
      const seconds = (now - lastFix.time) / 1000;
      // Reject jumps; re-anchor after a sustained interruption, never join missing travel.
      if (metersBetween(lastFix, point) / seconds > 10) return { meters: 0, status: 'weak' };
      lastFix = point;
      if (meters < Math.max(5, anchor.accuracy, accuracy)) return { meters: 0, status: 'ready' };
      anchor = point;
      return { meters, status: 'ready', point, newSegment: false };
    }
  };
}

function createRunLocation({ onDistance, onStatus, onPoint }, api = wx) {
  const filter = createDistanceFilter();
  let wanted = false;
  let listening = false;
  let revision = 0;
  let queue = Promise.resolve();
  let lastSignal = 0;
  let stale = false;
  let starting = false;
  let hasFix = false;
  let retryAt = 0;
  let failures = 0;
  let privacyReady = false;
  const blocked = err => /auth.*(?:deny|denied|reject)|permission|privacy|scope|not authorized|no authorization|not supported|API missing|接口.*权限|拒绝|未授权/i.test(String(err && (err.errMsg || err.message) || ''));
  const invoke = name => new Promise((resolve, reject) => {
    if (!api[name]) { reject(new Error('Location API missing')); return; }
    api[name]({ ...(name === 'startLocationUpdateBackground' ? { type: 'wgs84' } : {}), success: resolve, fail: reject });
  });
  const receive = event => {
    if (!wanted || !listening) return;
    const result = filter.add(event, Date.now());
    if (result.status === 'ready' || result.status === 'gap') {
      lastSignal = Date.now(); stale = false; hasFix = true; retryAt = 0; failures = 0;
    }
    if (result.point && onPoint) onPoint(result.point, result.newSegment);
    onStatus(result.status);
    if (result.meters) onDistance(result.meters);
  };
  function fail(err, stage) {
    filter.reset();
    // Never include location callbacks/coordinates in diagnostics.
    console.warn('[PAOXIA GPS]', stage, String(err && (err.errMsg || err.message) || 'location error'));
    if (stage === 'privacy' || blocked(err)) {
      wanted = false;
      retryAt = 0;
      detach();
      privacyReady = false;
      queue = queue.then(() => api.stopLocationUpdate ? invoke('stopLocationUpdate').catch(() => {}) : undefined);
      onStatus('unavailable');
      return;
    }
    if (hasFix) onStatus('interrupted');
    else onStatus('locating');
    retryAt = Date.now() + Math.min(15000, 1000 * Math.pow(2, Math.min(failures++, 4)));
  }
  const error = err => {
    if (!wanted || !listening) return;
    fail(err, 'update');
  };
  function detach() {
    if (listening) {
      api.offLocationChange(receive);
      if (api.offLocationChangeError) api.offLocationChangeError(error);
    }
    listening = false;
    filter.reset();
  }
  function launch(restart = false) {
    if (starting || !wanted) return queue;
    starting = true;
    retryAt = 0;
    const current = revision;
    queue = queue.then(async () => {
      let stage = 'privacy';
      try {
        if (!wanted || current !== revision) return;
        if (!api.onLocationChange || !api.offLocationChange || !api.stopLocationUpdate) throw new Error('Location API missing');
        if (!privacyReady && api.requirePrivacyAuthorize) await invoke('requirePrivacyAuthorize');
        if (!wanted || current !== revision) return;
        privacyReady = true;
        stage = 'start';
        if (restart) {
          detach();
          await invoke('stopLocationUpdate');
          if (!wanted || current !== revision) return;
        }
        // Subscribe before starting: the first fix can arrive before the success callback.
        listening = true;
        api.onLocationChange(receive);
        if (api.onLocationChangeError) api.onLocationChangeError(error);
        lastSignal = Date.now();
        stale = false;
        await invoke('startLocationUpdateBackground');
        if (!wanted || current !== revision) return;
        // Authorization dialogs may remain open for minutes. Start the signal timeout afterwards.
        lastSignal = Date.now();
      } catch (err) {
        if (wanted && current === revision) {
          detach();
          fail(err, stage);
        }
      } finally {
        if (current === revision) starting = false;
      }
    });
    return queue;
  }
  return {
    start() {
      if (wanted) return queue;
      wanted = true;
      ++revision;
      starting = false;
      stale = false;
      hasFix = false;
      failures = 0;
      retryAt = 0;
      onStatus('locating');
      return launch();
    },
    checkSignal() {
      if (!wanted || starting) return;
      if (retryAt) {
        if (Date.now() >= retryAt) launch(true);
        return;
      }
      if (listening && !stale && Date.now() - lastSignal > 30000) {
        stale = true;
        filter.reset();
        onStatus('interrupted');
        retryAt = Date.now() + 1000;
      }
    },
    stop() {
      if (!wanted && !listening && !starting) return queue;
      wanted = false;
      revision += 1;
      starting = false;
      retryAt = 0;
      detach(); // ignore callbacks immediately, even while authorization is pending
      queue = queue.then(() => api.stopLocationUpdate ? invoke('stopLocationUpdate').catch(() => {}) : undefined);
      return queue;
    }
  };
}

module.exports = { metersBetween, createDistanceFilter, createRunLocation };
