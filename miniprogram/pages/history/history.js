const { safeTop } = require('../../utils/layout');
const { formatDuration } = require('../../utils/time');
const { readRecords } = require('../../utils/records');

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const NOTICE_META = {
  tree: { label: 'Tree', glyph: '♧', className: 'tree' },
  wind: { label: 'Wind', glyph: '≋', className: 'wind' },
  cloud: { label: 'Cloud', glyph: '☁', className: 'cloud' },
  cat: { label: 'Cat', glyph: '⌁', className: 'cat' },
  dog: { label: 'Dog', image: '/assets/notice-dog.svg', className: 'dog' },
  flower: { label: 'Flower', image: '/assets/notice-flower.svg', className: 'flower' },
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
    periodLabels: { year: '', month: '', day: '' },
    monthValue: '',
    dayValue: '',
    dayWeekday: '',
    records: [],
    monthRows: [],
    yearRows: [],
    yearSummary: { times: '', total: '' },
    monthSummary: { times: '', total: '' },
    selectedRecord: null
  },

  onLoad() {
    let records = [];
    try {
      records = readRecords();
    } catch (error) {
      wx.showToast({ title: '未能读取本机记录', icon: 'none' });
    }
    const latestRun = records[0];
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const dayValue = latestRun ? latestRun.date : today;
    const monthValue = dayValue.slice(0, 7);
    this.setData({ safeTop: safeTop(), records, dayValue, monthValue, mode: latestRun ? 'day' : 'year' });
    this.applyYear(dayValue.slice(0, 4));
    this.applyMonth(monthValue);
    this.applyDay(dayValue);
  },

  onShow() {
    if (this.data.mode === 'day') this.applyDay(this.data.dayValue, this.data.selectedRecord && this.data.selectedRecord.id);
  },

  switchMode(event) {
    const mode = event.currentTarget.dataset.mode;
    this.setData({ mode });
    if (mode === 'year') this.applyYear(this.data.periodLabels.year);
    if (mode === 'month') this.applyMonth(this.data.monthValue);
    if (mode === 'day') this.applyDay(this.data.dayValue, this.data.selectedRecord && this.data.selectedRecord.id);
  },

  openDay(event) {
    const date = event.currentTarget.dataset.date || this.data.dayValue;
    this.setData({ mode: 'day' });
    this.applyDay(date, event.currentTarget.dataset.id);
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

  applyDay(value, recordId) {
    const { label, weekday } = dayPresentation(value);
    const periodLabels = { ...this.data.periodLabels, day: label };
    const selectedRecord = decorateRecord(this.data.records.find(record => record.date === value && (!recordId || record.id === recordId)));
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
