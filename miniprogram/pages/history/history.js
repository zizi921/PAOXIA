const { safeTop } = require('../../utils/layout');
const { formatDuration } = require('../../utils/time');

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const NOTICE_META = {
  tree: { label: 'Tree', glyph: '♧', className: 'tree' },
  wind: { label: 'Wind', glyph: '≋', className: 'wind' },
  cloud: { label: 'Cloud', glyph: '☁', className: 'cloud' },
  cat: { label: 'Cat', glyph: '⌁', className: 'cat' },
  sun: { label: 'Sun', glyph: '☀', className: 'sun' },
  moon: { label: 'Moon', glyph: '☾', className: 'moon' },
  streetlight: { label: 'Streetlight', glyph: '⌑', className: 'streetlight' },
  nothing: { label: 'Didn’t notice', glyph: '···', className: 'nothing' }
};
const WEATHER_META = {
  sunny: { glyph: '☀', className: 'sunny' },
  cloudy: { glyph: '☁', className: 'cloudy' },
  rainy: { glyph: '☂', className: 'rainy' },
  windy: { glyph: '≋', className: 'windy' }
};

const DEMO_RECORDS = [
  { id: 'demo-2026-09-25', date: '2026-09-25', durationSeconds: 37 * 60, distance: '1.8 km', mood: 'Calm', moodType: 'calm', notices: ['cat', 'wind'], note: '' },
  { id: 'demo-2026-09-21', date: '2026-09-21', durationSeconds: 52 * 60, distance: '5.2 km', mood: 'Good', moodType: 'good', notices: ['tree', 'cloud'], note: 'Such a beautiful sunset!' },
  { id: 'demo-2026-09-18', date: '2026-09-18', durationSeconds: 18 * 60, distance: '— km', mood: 'Tired', moodType: 'tired', notices: ['wind'], note: '' },
  { id: 'demo-2026-09-16', date: '2026-09-16', durationSeconds: 23 * 60, distance: '3.2 km', mood: 'Calm', moodType: 'calm', notices: ['sun'], note: '' },
  { id: 'demo-2026-09-12', date: '2026-09-12', durationSeconds: 41 * 60, distance: '4.1 km', mood: 'Good', moodType: 'good', notices: ['tree', 'cat'], note: '' },
  { id: 'demo-2026-09-06', date: '2026-09-06', durationSeconds: 56 * 60, distance: '6.0 km', mood: 'Good', moodType: 'good', notices: ['cloud', 'moon'], note: '' }
];

const BASE_YEAR_ROWS = [
  { month: 'SEP', value: '2026-09', times: 6, totalSeconds: 227 * 60, level: 4 },
  { month: 'AUG', value: '2026-08', times: 9, totalSeconds: 252 * 60, level: 5 },
  { month: 'JUL', value: '2026-07', times: 8, totalSeconds: 216 * 60, level: 4 },
  { month: 'JUN', value: '2026-06', times: 5, totalSeconds: 118 * 60, level: 3 },
  { month: 'MAY', value: '2026-05', times: 7, totalSeconds: 204 * 60, level: 5 },
  { month: 'APR', value: '2026-04', times: 4, totalSeconds: 96 * 60, level: 3 },
  { month: 'MAR', value: '2026-03', times: 5, totalSeconds: 130 * 60, level: 3 },
  { month: 'FEB', value: '2026-02', times: 3, totalSeconds: 68 * 60, level: 2 },
  { month: 'JAN', value: '2026-01', times: 1, totalSeconds: 28 * 60, level: 1 }
];

function dateParts(value) {
  const [yearText, monthText, dayText] = String(value || '').split('-');
  return {
    year: Number(yearText) || 2026,
    monthIndex: Math.min(11, Math.max(0, (Number(monthText) || 1) - 1)),
    day: Number(dayText) || 1
  };
}

function monthPresentation(value) {
  const { year, monthIndex } = dateParts(`${value}-01`);
  return { label: `${MONTH_NAMES[monthIndex]} ${year}`, abbr: MONTH_ABBR[monthIndex] };
}

function shiftMonth(value, direction) {
  const { year, monthIndex } = dateParts(`${value}-01`);
  const date = new Date(year, monthIndex + direction, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dayPresentation(value) {
  const { year, monthIndex, day } = dateParts(value);
  const date = new Date(year, monthIndex, day);
  return { label: `${MONTH_NAMES[monthIndex]} ${day}, ${year}`, weekday: WEEKDAY_NAMES[date.getDay()] };
}

function shiftDay(value, direction) {
  const { year, monthIndex, day } = dateParts(value);
  const date = new Date(year, monthIndex, day + direction);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function totalText(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (hours) return `${hours} h ${String(minutes).padStart(2, '0')} min`;
  return minutes ? `${minutes} min` : `${Math.floor(safeSeconds)} sec`;
}

function decorateRecord(record) {
  if (!record) return null;
  const { monthIndex, day } = dateParts(record.date);
  const date = new Date(`${record.date}T12:00:00`);
  const weather = WEATHER_META[record.weather] || { glyph: '☁', className: 'decorative' };
  return {
    ...record,
    day: `${MONTH_ABBR[monthIndex]} ${day}`,
    weekday: WEEKDAY_NAMES[date.getDay()].slice(0, 3),
    weekdayLong: WEEKDAY_NAMES[date.getDay()],
    duration: formatDuration(record.durationSeconds),
    distance: record.distance || '— km',
    mood: record.mood || 'Not set',
    moodType: record.moodType || 'unsure',
    marks: record.notices || [],
    noticeItems: (record.notices || []).map(value => NOTICE_META[value]).filter(Boolean),
    weatherGlyph: weather.glyph,
    weatherClass: weather.className,
    note: record.note || ''
  };
}

function yearRowsFor(records, year) {
  if (Number(year) !== 2026) {
    const byMonth = {};
    records.filter(record => record.date.startsWith(`${year}-`)).forEach(record => {
      const value = record.date.slice(0, 7);
      if (!byMonth[value]) byMonth[value] = { times: 0, totalSeconds: 0 };
      byMonth[value].times += 1;
      byMonth[value].totalSeconds += record.durationSeconds;
    });
    return Object.keys(byMonth).sort().reverse().map(value => {
      const monthIndex = Number(value.slice(5, 7)) - 1;
      const aggregate = byMonth[value];
      return { month: MONTH_ABBR[monthIndex], value, times: aggregate.times, totalSeconds: aggregate.totalSeconds, level: Math.min(5, aggregate.times) };
    });
  }

  const rows = BASE_YEAR_ROWS.map(row => ({ ...row }));
  records.filter(record => !String(record.id).startsWith('demo-') && record.date.startsWith('2026-')).forEach(record => {
    const value = record.date.slice(0, 7);
    const row = rows.find(item => item.value === value);
    if (row) {
      row.times += 1;
      row.totalSeconds += record.durationSeconds;
    } else {
      const monthIndex = Number(value.slice(5, 7)) - 1;
      rows.push({ month: MONTH_ABBR[monthIndex], value, times: 1, totalSeconds: record.durationSeconds, level: 1 });
    }
  });
  return rows.sort((a, b) => b.value.localeCompare(a.value));
}

function presentYearRows(rows) {
  return rows.map(row => ({
    ...row,
    timesText: `${row.times} ${row.times === 1 ? 'time' : 'times'}`,
    total: totalText(row.totalSeconds)
  }));
}

Page({
  data: {
    safeTop: 96,
    mode: 'year',
    periodLabels: { year: '2026', month: 'September 2026', day: 'September 21, 2026' },
    monthValue: '2026-09',
    dayValue: '2026-09-21',
    dayWeekday: 'Monday',
    records: DEMO_RECORDS,
    monthRows: [],
    yearRows: presentYearRows(BASE_YEAR_ROWS),
    yearSummary: { times: '48 times out.', total: '22 h 19 min.' },
    monthSummary: { times: '6 times out.', total: '3 h 47 min.' },
    selectedRecord: decorateRecord(DEMO_RECORDS[1])
  },

  onLoad() {
    const app = getApp();
    const latestRun = app && app.globalData ? app.globalData.latestRun : null;
    const records = latestRun ? [latestRun, ...DEMO_RECORDS] : [...DEMO_RECORDS];
    const dayValue = latestRun ? latestRun.date : this.data.dayValue;
    const monthValue = dayValue.slice(0, 7);
    this.setData({ safeTop: safeTop(), records, dayValue, monthValue, mode: latestRun ? 'day' : 'year' });
    this.applyYear(this.data.periodLabels.year);
    this.applyMonth(monthValue);
    this.applyDay(dayValue);
  },

  onShow() {
    if (this.data.mode === 'day') this.applyDay(this.data.dayValue);
  },

  switchMode(event) {
    const mode = event.currentTarget.dataset.mode;
    this.setData({ mode });
    if (mode === 'year') this.applyYear(this.data.periodLabels.year);
    if (mode === 'month') this.applyMonth(this.data.monthValue);
    if (mode === 'day') this.applyDay(this.data.dayValue);
  },

  openDay(event) {
    const date = event.currentTarget.dataset.date || this.data.dayValue;
    this.setData({ mode: 'day' });
    this.applyDay(date);
  },

  openMonth(event) {
    const value = event.currentTarget.dataset.month || this.data.monthValue;
    this.setData({ mode: 'month' });
    this.applyMonth(value);
  },

  chooseMonth(event) {
    this.applyMonth(event.detail.value);
  },

  chooseDay(event) {
    this.applyDay(event.detail.value);
  },

  applyYear(yearValue) {
    const year = String(yearValue || 2026);
    const rawRows = yearRowsFor(this.data.records, year);
    const times = rawRows.reduce((sum, row) => sum + row.times, 0);
    const seconds = rawRows.reduce((sum, row) => sum + row.totalSeconds, 0);
    const periodLabels = { ...this.data.periodLabels, year };
    this.setData({
      periodLabels,
      yearRows: presentYearRows(rawRows),
      yearSummary: { times: times ? `${times} times out.` : 'No days out yet.', total: times ? `${totalText(seconds)}.` : 'Try another year.' }
    });
  },

  applyMonth(value) {
    const { label } = monthPresentation(value);
    const records = this.data.records.filter(record => record.date.startsWith(`${value}-`)).map(decorateRecord);
    const aggregate = yearRowsFor(this.data.records, value.slice(0, 4)).find(row => row.value === value);
    const times = aggregate ? aggregate.times : records.length;
    const seconds = aggregate ? aggregate.totalSeconds : records.reduce((sum, record) => sum + record.durationSeconds, 0);
    const periodLabels = { ...this.data.periodLabels, month: label };
    this.setData({
      monthValue: value,
      periodLabels,
      monthRows: records,
      monthSummary: { times: times ? `${times} times out.` : 'No days out yet.', total: times ? `${totalText(seconds)}.` : 'Pick another month.' }
    });
  },

  applyDay(value) {
    const { label, weekday } = dayPresentation(value);
    const periodLabels = { ...this.data.periodLabels, day: label };
    const selectedRecord = decorateRecord(this.data.records.find(record => record.date === value));
    this.setData({ dayValue: value, dayWeekday: weekday, selectedRecord, periodLabels });
  },

  stepPeriod(event) {
    const direction = Number(event.currentTarget.dataset.direction);
    if (this.data.mode === 'year') {
      this.applyYear(String((Number(this.data.periodLabels.year) || 2026) + direction));
      return;
    }
    if (this.data.mode === 'month') {
      this.applyMonth(shiftMonth(this.data.monthValue, direction));
      return;
    }
    this.applyDay(shiftDay(this.data.dayValue, direction));
  },

  goAgain() {
    wx.reLaunch({ url: '/pages/home/home' });
  }
});
