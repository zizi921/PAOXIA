const { safeTop } = require('../../utils/layout');
const { formatDuration } = require('../../utils/time');
const { readRecords } = require('../../utils/records');
const { readLanguage, copyFor } = require('../../utils/i18n');
const { shareAppMessage, showShareMenu } = require('../../utils/share');

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_NAMES_ZH = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const WEEKDAY_SHORT_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const NOTICE_META = {
  tree: { labelKey: 'tree', image: '/assets/notice-outline-tree.png', className: 'tree' },
  people: { labelKey: 'people', image: '/assets/notice-outline-people-bold.png', className: 'people' },
  wind: { labelKey: 'wind', image: '/assets/notice-outline-wind.png', className: 'wind' },
  cloud: { labelKey: 'cloud', image: '/assets/notice-outline-cloud.png', className: 'cloud' },
  cat: { labelKey: 'cat', image: '/assets/notice-outline-cat.png', className: 'cat' },
  dog: { labelKey: 'dog', image: '/assets/notice-outline-dog.png', className: 'dog' },
  flower: { labelKey: 'flower', image: '/assets/notice-outline-flower.png', className: 'flower' },
  sun: { labelKey: 'sun', glyph: '☀', className: 'sun' },
  moon: { labelKey: 'moon', glyph: '☾', className: 'moon' },
  streetlight: { labelKey: 'streetlight', image: '/assets/notice-outline-streetlight.png', className: 'streetlight' },
  nothing: { labelKey: 'didntNotice', image: '/assets/notice-outline-nothing.png', className: 'nothing' }
};
const WEATHER_META = {
  sunny: { glyph: '☀', className: 'sunny' },
  cloudy: { glyph: '☁', className: 'cloudy' },
  rainy: { glyph: '☂', className: 'rainy' },
  windy: { glyph: '≋', className: 'windy' }
};
const HISTORY_RUNNER_POSES = Array.from({ length: 10 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return { image: `/assets/history-runner-${number}.png`, className: `pose-${number}` };
});
const FILTER_START_YEAR = 2020;
const FILTER_END_YEAR = 2035;

function filterYears(language) {
  return Array.from({ length: FILTER_END_YEAR - FILTER_START_YEAR + 1 }, (_, index) => {
    const year = FILTER_START_YEAR + index;
    return { value: String(year), label: language === 'zh' ? `${year}年` : String(year) };
  });
}

function filterMonths(language) {
  return MONTH_NAMES.map((name, index) => ({
    value: String(index + 1).padStart(2, '0'),
    label: language === 'zh' ? `${index + 1}月` : name
  }));
}

function filterDays(year, month, language) {
  const count = new Date(Number(year), Number(month), 0).getDate();
  return Array.from({ length: count }, (_, index) => ({
    value: String(index + 1).padStart(2, '0'),
    label: language === 'zh' ? `${index + 1}日` : String(index + 1)
  }));
}

function runnerPoseFor(record) {
  const key = String((record && (record.id || record.date)) || '');
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = ((hash << 5) - hash + key.charCodeAt(index)) | 0;
  }
  return HISTORY_RUNNER_POSES[Math.abs(hash) % HISTORY_RUNNER_POSES.length];
}

function dateParts(value) {
  const [yearText, monthText, dayText] = String(value || '').split('-');
  return {
    year: Number(yearText) || 2026,
    monthIndex: Math.min(11, Math.max(0, (Number(monthText) || 1) - 1)),
    day: Number(dayText) || 1
  };
}

function monthPresentation(value, language) {
  const { year, monthIndex } = dateParts(`${value}-01`);
  if (language === 'zh') return { label: `${year}年${monthIndex + 1}月`, abbr: `${monthIndex + 1}月` };
  return { label: `${MONTH_NAMES[monthIndex].slice(0, 3)} ${year}`, abbr: MONTH_ABBR[monthIndex] };
}

function shiftMonth(value, direction) {
  const { year, monthIndex } = dateParts(`${value}-01`);
  const date = new Date(year, monthIndex + direction, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dayPresentation(value, language) {
  const { year, monthIndex, day } = dateParts(value);
  const date = new Date(year, monthIndex, day);
  if (language === 'zh') return { label: `${year}年${monthIndex + 1}月${day}日`, weekday: WEEKDAY_NAMES_ZH[date.getDay()] };
  return { label: `${MONTH_NAMES[monthIndex].slice(0, 3)} ${day}, ${year}`, weekday: WEEKDAY_NAMES[date.getDay()] };
}

function shiftDay(value, direction) {
  const { year, monthIndex, day } = dateParts(value);
  const date = new Date(year, monthIndex, day + direction);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function totalText(totalSeconds, language) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (language === 'zh') {
    if (hours) return `${hours}小时 ${minutes}分钟`;
    return minutes ? `${minutes}分钟` : `${Math.floor(safeSeconds)}秒`;
  }
  if (hours) return `${hours} h ${String(minutes).padStart(2, '0')} min`;
  return minutes ? `${minutes} min` : `${Math.floor(safeSeconds)} sec`;
}

function decorateRecord(record, language, copy) {
  if (!record) return null;
  const { monthIndex, day } = dateParts(record.date);
  const date = new Date(`${record.date}T12:00:00`);
  const weather = WEATHER_META[record.weather] || { glyph: '☁', className: 'decorative' };
  const runnerPose = runnerPoseFor(record);
  return {
    ...record,
    day: language === 'zh' ? `${monthIndex + 1}月${day}日` : `${MONTH_ABBR[monthIndex]} ${day}`,
    weekday: language === 'zh' ? WEEKDAY_SHORT_ZH[date.getDay()] : WEEKDAY_NAMES[date.getDay()].slice(0, 3),
    weekdayLong: language === 'zh' ? WEEKDAY_NAMES_ZH[date.getDay()] : WEEKDAY_NAMES[date.getDay()],
    duration: formatDuration(record.durationSeconds, language),
    distance: record.distance || '— km',
    mood: record.mood === 'Not set' || !record.mood ? copy.notSet : copy[record.moodType] || record.mood,
    moodType: record.moodType || 'unsure',
    moodImage: `/assets/mood-outline-${['good', 'calm', 'tired', 'unsure'].includes(record.moodType) ? record.moodType : 'unsure'}.png`,
    marks: record.notices || [],
    noticeItems: (record.notices || []).map(value => {
      const meta = NOTICE_META[value];
      return meta ? { ...meta, label: copy[meta.labelKey] } : null;
    }).filter(Boolean),
    weatherGlyph: weather.glyph,
    weatherClass: weather.className,
    runnerImage: runnerPose.image,
    runnerPoseClass: runnerPose.className,
    note: record.note || ''
  };
}

function yearRowsFor(records, year, language) {
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
    return { month: language === 'zh' ? `${monthIndex + 1}月` : MONTH_ABBR[monthIndex], value, times: aggregate.times, totalSeconds: aggregate.totalSeconds, level: Math.min(5, aggregate.times) };
  });
}

function presentYearRows(rows, language) {
  return rows.map(row => ({
    ...row,
    timesText: language === 'zh' ? `${row.times}次` : `${row.times} ${row.times === 1 ? 'time' : 'times'}`,
    total: totalText(row.totalSeconds, language)
  }));
}

Page({
  onShareAppMessage: shareAppMessage,
  data: {
    safeTop: 96,
    dayScale: 1,
    language: 'en',
    copy: copyFor('en', 'history'),
    mode: 'year',
    periodLabels: { year: '', month: '', day: '' },
    monthValue: '',
    dayValue: '',
    dayWeekday: '',
    records: [],
    monthRows: [],
    yearRows: [],
    yearSummary: { times: '', total: '' },
    monthSummary: { times: '', total: '', distance: '' },
    selectedRecord: null,
    filterOpen: false,
    filterMode: 'month',
    filterTitle: '',
    filterYears: [],
    filterMonths: [],
    filterDays: [],
    filterValue: [0, 0]
  },

  // Keep vector payloads in the logic layer; only the visible detail needs them.
  prepareRecords(records) {
    this.drawings = new Map();
    return records.map(record => {
      const noteDrawing = record.noteDrawing;
      const summary = Object.assign({}, record);
      delete summary.noteDrawing;
      if (noteDrawing && noteDrawing.length) this.drawings.set(record.id, noteDrawing);
      return summary;
    });
  },

  onLoad(options) {
    const language = readLanguage();
    const copy = copyFor(language, 'history');
    let records = [];
    try {
      records = this.prepareRecords(readRecords());
    } catch (error) {
      wx.showToast({ title: copy.readError, icon: 'none' });
    }
    const latestRun = records.find(record => record.id === (options && options.recordId)) || records[0];
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const dayValue = latestRun ? latestRun.date : today;
    const monthValue = dayValue.slice(0, 7);
    this.setData({ safeTop: safeTop(), language, copy, records, dayValue, monthValue, mode: latestRun ? 'day' : 'year' });
    this.applyYear(dayValue.slice(0, 4));
    this.applyMonth(monthValue);
    this.applyDay(dayValue, latestRun && latestRun.id);
    this.skipInitialShow = true;
  },

  onShow() {
    showShareMenu();
    // onLoad already populated this page; refresh only when returning to it.
    if (this.skipInitialShow) {
      this.skipInitialShow = false;
      return;
    }
    try {
      const language = readLanguage();
      this.setData({ language, copy: copyFor(language, 'history'), records: this.prepareRecords(readRecords()) });
    } catch (error) {
      wx.showToast({ title: this.data.copy.readError, icon: 'none' });
      return;
    }
    this.applyYear(this.data.periodLabels.year);
    this.applyMonth(this.data.monthValue);
    if (this.data.mode === 'day') this.applyDay(this.data.dayValue, this.data.selectedRecord && this.data.selectedRecord.id);
  },

  onReady() { this.fitDayDetail(); },
  onResize() { this.fitDayDetail(); },

  // Fit the complete detail into the space above the fixed action button.
  fitDayDetail() {
    if (this.data.mode !== 'day' || !this.data.selectedRecord || !this.createSelectorQuery) return;
    this.setData({ dayScale: 1 }, () => {
      const query = this.createSelectorQuery();
      query.select('.day-detail').boundingClientRect();
      query.select('.day-detail-inner').boundingClientRect();
      query.exec(rects => {
        const available = rects && rects[0];
        const content = rects && rects[1];
        if (!available || !content || !content.height) return;
        this.setData({ dayScale: Math.min(1, Math.max(0, available.height - 4) / content.height) });
      });
    });
  },

  editRecord() {
    if (this.editNavigating || this.data.mode !== 'day' || !this.data.selectedRecord) return;
    this.editNavigating = true;
    wx.navigateTo({
      url: `/pages/recap/recap?recordId=${encodeURIComponent(this.data.selectedRecord.id)}`,
      fail: () => { wx.showToast({ title: this.data.copy.editError, icon: 'none' }); },
      complete: () => { this.editNavigating = false; }
    });
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

  openDateFilter(event) {
    const mode = event.currentTarget.dataset.mode;
    const sourceValue = mode === 'year' ? `${this.data.periodLabels.year}-01-01`
      : mode === 'day' ? this.data.dayValue : `${this.data.monthValue}-01`;
    const { year, monthIndex, day } = dateParts(sourceValue);
    const years = filterYears(this.data.language);
    const months = filterMonths(this.data.language);
    const days = filterDays(year, monthIndex + 1, this.data.language);
    const yearIndex = Math.min(years.length - 1, Math.max(0, year - FILTER_START_YEAR));
    const value = mode === 'year' ? [yearIndex] : mode === 'day'
      ? [yearIndex, monthIndex, Math.min(days.length - 1, Math.max(0, day - 1))]
      : [yearIndex, monthIndex];
    this.setData({
      filterOpen: true,
      filterMode: mode,
      filterTitle: this.data.copy[`${mode}Filter`],
      filterYears: years,
      filterMonths: months,
      filterDays: days,
      filterValue: value
    });
  },

  changeDateFilter(event) {
    const value = event.detail.value.slice();
    const years = this.data.filterYears;
    const months = this.data.filterMonths;
    const year = years[value[0]] ? years[value[0]].value : String(FILTER_START_YEAR);
    const month = months[value[1]] ? months[value[1]].value : '01';
    if (this.data.filterMode === 'day') {
      const days = filterDays(year, month, this.data.language);
      value[2] = Math.min(value[2] || 0, days.length - 1);
      this.setData({ filterDays: days, filterValue: value });
      return;
    }
    this.setData({ filterValue: value });
  },

  cancelDateFilter() {
    this.setData({ filterOpen: false });
  },

  confirmDateFilter() {
    const [yearIndex, monthIndex, dayIndex] = this.data.filterValue;
    const year = this.data.filterYears[yearIndex].value;
    this.setData({ filterOpen: false });
    if (this.data.filterMode === 'year') {
      this.applyYear(year);
      return;
    }
    const month = this.data.filterMonths[monthIndex].value;
    if (this.data.filterMode === 'day') {
      const day = this.data.filterDays[dayIndex].value;
      this.applyDay(`${year}-${month}-${day}`);
      return;
    }
    this.applyMonth(`${year}-${month}`);
  },

  preventTouch() {},

  applyYear(yearValue) {
    const year = String(yearValue || 2026);
    const rawRows = yearRowsFor(this.data.records, year, this.data.language);
    const distances = this.data.records.filter(record => record.date.startsWith(`${year}-`)).map(record => {
      const match = String(record.distance || '').match(/^(\d+(?:\.\d+)?)\s*km$/);
      return match ? Number(match[1]) : null;
    }).filter(distance => distance !== null && Number.isFinite(distance));
    const distance = distances.length ? `${Number(distances.reduce((sum, km) => sum + km, 0).toFixed(2))} km` : '— km';
    const times = rawRows.reduce((sum, row) => sum + row.times, 0);
    const seconds = rawRows.reduce((sum, row) => sum + row.totalSeconds, 0);
    const periodLabels = { ...this.data.periodLabels, year };
    this.setData({
      periodLabels,
      yearRows: presentYearRows(rawRows, this.data.language),
      yearSummary: this.data.language === 'zh'
        ? { distance, times: times ? `${times}次跑步` : this.data.copy.noRuns, total: times ? totalText(seconds, 'zh') : this.data.copy.emptyYearHint }
        : { distance, times: times ? `${times} times out.` : this.data.copy.noRuns, total: times ? `${totalText(seconds, 'en')}.` : this.data.copy.emptyYearHint }
    });
  },

  applyMonth(value) {
    const { label } = monthPresentation(value, this.data.language);
    const records = this.data.records.filter(record => record.date.startsWith(`${value}-`)).map(record => decorateRecord(record, this.data.language, this.data.copy));
    const aggregate = yearRowsFor(this.data.records, value.slice(0, 4), this.data.language).find(row => row.value === value);
    const times = aggregate ? aggregate.times : records.length;
    const seconds = aggregate ? aggregate.totalSeconds : records.reduce((sum, record) => sum + record.durationSeconds, 0);
    const distances = records.map(record => {
      const match = String(record.distance || '').match(/^(\d+(?:\.\d+)?)\s*km$/);
      return match ? Number(match[1]) : null;
    }).filter(distance => distance !== null && Number.isFinite(distance));
    const distance = distances.length
      ? `${Number(distances.reduce((sum, km) => sum + km, 0).toFixed(2))} km`
      : '— km';
    const periodLabels = { ...this.data.periodLabels, month: label };
    this.setData({
      monthValue: value,
      periodLabels,
      monthRows: records,
      monthSummary: this.data.language === 'zh'
        ? { distance, times: times ? `${times}次跑步` : this.data.copy.noRuns, total: times ? totalText(seconds, 'zh') : this.data.copy.emptyMonthHint }
        : { distance, times: times ? `${times} times out.` : this.data.copy.noRuns, total: times ? `${totalText(seconds, 'en')}.` : this.data.copy.emptyMonthHint }
    });
  },

  applyDay(value, recordId) {
    const { label, weekday } = dayPresentation(value, this.data.language);
    const periodLabels = { ...this.data.periodLabels, day: label };
    const exactRecord = this.data.records.find(record => record.date === value && (!recordId || record.id === recordId));
    const selectedRecord = decorateRecord(exactRecord || (recordId && this.data.records.find(record => record.date === value)), this.data.language, this.data.copy);
    if (selectedRecord) selectedRecord.noteDrawing = this.drawings && this.drawings.get(selectedRecord.id) || [];
    this.setData({ dayValue: value, dayWeekday: weekday, selectedRecord, periodLabels, dayScale: 1 }, () => this.fitDayDetail());
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
