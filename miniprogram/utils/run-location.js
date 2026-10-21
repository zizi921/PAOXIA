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
  const invoke = name => new Promise((resolve, reject) => {
    if (!api[name]) { reject(new Error('Location unavailable')); return; }
    api[name]({ ...(name === 'startLocationUpdateBackground' ? { type: 'wgs84' } : {}), success: resolve, fail: reject });
  });
  const receive = event => {
    if (!wanted || !listening) return;
    const result = filter.add(event, Date.now());
    if (result.status === 'ready' || result.status === 'gap') { lastSignal = Date.now(); stale = false; }
    if (result.point && onPoint) onPoint(result.point, result.newSegment);
    onStatus(result.status);
    if (result.meters) onDistance(result.meters);
  };
  const error = () => {
    if (!wanted) return;
    filter.reset();
    onStatus('unavailable');
  };
  function detach() {
    if (listening) {
      api.offLocationChange(receive);
      if (api.offLocationChangeError) api.offLocationChangeError(error);
    }
    listening = false;
    filter.reset();
  }
  return {
    start() {
      if (wanted) return queue;
      wanted = true;
      const current = ++revision;
      lastSignal = Date.now();
      stale = false;
      onStatus('locating');
      queue = queue.then(async () => {
        if (!wanted || current !== revision) return;
        try {
          if (!api.onLocationChange || !api.offLocationChange || !api.stopLocationUpdate) throw new Error('Location unavailable');
          if (api.requirePrivacyAuthorize) await invoke('requirePrivacyAuthorize');
          if (!wanted || current !== revision) return;
          await invoke('startLocationUpdateBackground');
          if (!wanted || current !== revision) return; // queued stop cleans up a late authorization
          api.onLocationChange(receive);
          if (api.onLocationChangeError) api.onLocationChangeError(error);
          listening = true;
        } catch (err) {
          if (wanted && current === revision) { wanted = false; detach(); onStatus('unavailable'); }
        }
      });
      return queue;
    },
    checkSignal() {
      if (wanted && !stale && Date.now() - lastSignal > 30000) {
        stale = true;
        filter.reset();
        onStatus('interrupted');
      }
    },
    stop() {
      if (!wanted && !listening) return queue;
      wanted = false;
      revision += 1;
      detach(); // ignore callbacks immediately, even while authorization is pending
      queue = queue.then(() => api.stopLocationUpdate ? invoke('stopLocationUpdate').catch(() => {}) : undefined);
      return queue;
    }
  };
}

module.exports = { metersBetween, createDistanceFilter, createRunLocation };
