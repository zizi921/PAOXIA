function twoDigits(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function formatElapsed(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}`;
}

function formatDuration(totalSeconds, language = 'en') {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (language === 'zh') {
    if (hours > 0) return `${hours}小时 ${minutes}分钟`;
    if (minutes > 0) return `${minutes}分钟`;
    return `${safeSeconds}秒`;
  }
  if (hours > 0) return `${hours} hr ${minutes} min`;
  if (minutes > 0) return `${minutes} min`;
  return `${safeSeconds} sec`;
}

function formatPace(totalSeconds, distance) {
  const seconds = Number(totalSeconds);
  const match = String(distance == null ? '' : distance).trim().match(/^(\d+(?:\.\d+)?|\.\d+)\s*(?:km)?$/);
  const km = match ? Number(match[1]) : 0;
  if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(km) || km <= 0) return '—';
  const paceSeconds = Math.round(seconds / km);
  if (!Number.isFinite(paceSeconds) || paceSeconds <= 0) return '—';
  return `${Math.floor(paceSeconds / 60)}:${twoDigits(paceSeconds % 60)} /km`;
}

module.exports = { formatElapsed, formatDuration, formatPace };
