const { safeTop } = require('../../utils/layout');

Page({
  data: {
    safeTop: 96,
    mode: 'year',
    periodLabels: {
      year: '2026',
      month: 'September 2026',
      day: 'September 21, 2026'
    },
    monthRows: [
      { day: 'SEP 25', weekday: 'Thu', duration: '37 min', distance: '1.8 km', mood: 'Calm', moodType: 'calm', marks: ['cat', 'wind'] },
      { day: 'SEP 21', weekday: 'Sun', duration: '52 min', distance: '5.2 km', mood: 'Good', moodType: 'good', marks: ['tree', 'cloud'] },
      { day: 'SEP 18', weekday: 'Thu', duration: '18 min', distance: '— km', mood: 'Tired', moodType: 'tired', marks: ['wind'] },
      { day: 'SEP 16', weekday: 'Tue', duration: '23 min', distance: '3.2 km', mood: 'Calm', moodType: 'calm', marks: ['sun'] },
      { day: 'SEP 12', weekday: 'Fri', duration: '41 min', distance: '4.1 km', mood: 'Good', moodType: 'good', marks: ['tree', 'cat'] },
      { day: 'SEP 6', weekday: 'Sat', duration: '56 min', distance: '6.0 km', mood: 'Good', moodType: 'good', marks: ['cloud', 'moon'] }
    ],
    yearRows: [
      { month: 'SEP', times: '6 times', total: '2 h 47 min', level: 4 },
      { month: 'AUG', times: '9 times', total: '4 h 12 min', level: 5 },
      { month: 'JUL', times: '8 times', total: '3 h 36 min', level: 4 },
      { month: 'JUN', times: '5 times', total: '1 h 58 min', level: 3 },
      { month: 'MAY', times: '7 times', total: '3 h 24 min', level: 5 },
      { month: 'APR', times: '4 times', total: '1 h 36 min', level: 3 },
      { month: 'MAR', times: '5 times', total: '2 h 10 min', level: 3 },
      { month: 'FEB', times: '3 times', total: '1 h 08 min', level: 2 },
      { month: 'JAN', times: '1 time', total: '28 min', level: 1 }
    ]
  },

  onLoad() {
    this.setData({ safeTop: safeTop() });
  },

  switchMode(event) {
    this.setData({ mode: event.currentTarget.dataset.mode });
  },

  openDay() {
    this.setData({ mode: 'day' });
  },

  openMonth() {
    this.setData({ mode: 'month' });
  },

  stepPeriod(event) {
    const direction = Number(event.currentTarget.dataset.direction);
    const periodLabels = { ...this.data.periodLabels };
    if (this.data.mode === 'year') {
      const currentYear = Number(periodLabels.year) || 2026;
      periodLabels.year = String(currentYear + direction);
    } else if (this.data.mode === 'month') {
      periodLabels.month = direction < 0 ? 'August 2026' : 'October 2026';
    } else {
      periodLabels.day = direction < 0 ? 'September 20, 2026' : 'September 22, 2026';
    }
    this.setData({ periodLabels });
  },

  goAgain() {
    wx.reLaunch({ url: '/pages/home/home' });
  }
});
