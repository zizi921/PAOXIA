const { safeTop } = require('../../utils/layout');
const { readActiveRun } = require('../../utils/active-run');
const { readDraft } = require('../../utils/recap-draft');
const { readLanguage, saveLanguage, copyFor } = require('../../utils/i18n');
const { shareAppMessage, shareTimeline, showShareMenu } = require('../../utils/share');
Page({
  onShareAppMessage: shareAppMessage,
  onShareTimeline: shareTimeline,
  data: { safeTop: 96, hasActiveRun: false, hasDraft: false, countdown: '', language: 'en', copy: copyFor('en', 'home') },
  onLoad() { this.setData({ safeTop: safeTop() }); },
  onHide() { this.cancelCountdown(); },
  onUnload() { this.cancelCountdown(); },
  onShow() {
    showShareMenu(true);
    try {
      const language = readLanguage();
      this.setData({ language, copy: copyFor(language, 'home'), hasActiveRun: !!readActiveRun(), hasDraft: !!readDraft() });
    } catch (error) {
      wx.showToast({ title: this.data.copy.loadError, icon: 'none' });
    }
  },
  chooseLanguage(event) {
    if (this.data.countdown) return;
    const language = event.currentTarget.dataset.language;
    if (language === this.data.language) return;
    try {
      saveLanguage(language);
      this.setData({ language, copy: copyFor(language, 'home') });
    } catch (error) {
      wx.showToast({ title: this.data.copy.loadError, icon: 'none' });
    }
  },
  openHistory() {
    if (this.data.language === 'zh' || this.navigating) return;
    this.navigating = true;
    wx.navigateTo({
      url: '/pages/history/history',
      complete: () => { this.navigating = false; }
    });
  },
  go() {
    if (this.data.language === 'zh' || this.navigating) return;
    let activeRun;
    let draft;
    try {
      activeRun = readActiveRun();
      draft = readDraft();
    } catch (error) {
      wx.showToast({ title: this.data.copy.loadError, icon: 'none' });
      return;
    }
    if (!activeRun && !draft) {
      this.startCountdown();
      return;
    }
    this.navigating = true;
    wx.navigateTo({
      url: !activeRun && draft ? '/pages/recap/recap' : `/pages/run/run?startedAt=${activeRun.startedAt}`,
      complete: () => { this.navigating = false; }
    });
  },
  startCountdown() {
    this.navigating = true;
    this.countdownEndsAt = Date.now() + 3000;
    this.setData({ countdown: '3' });
    const advance = () => {
      const remaining = Math.ceil((this.countdownEndsAt - Date.now()) / 1000);
      if (remaining > 0) {
        this.setData({ countdown: String(remaining) });
        this.countdownTimer = setTimeout(advance, 100);
        return;
      }
      this.setData({ countdown: 'GO' });
      this.countdownTimer = setTimeout(() => {
        this.countdownTimer = null;
        wx.navigateTo({
          url: `/pages/run/run?startedAt=${Date.now()}`,
          fail: () => wx.showToast({ title: this.data.copy.loadError, icon: 'none' }),
          complete: () => {
            this.setData({ countdown: '' });
            this.navigating = false;
          }
        });
      }, 600);
    };
    this.countdownTimer = setTimeout(advance, 100);
  },
  cancelCountdown() {
    if (this.countdownTimer == null) return;
    clearTimeout(this.countdownTimer);
    this.countdownTimer = null;
    this.navigating = false;
    this.setData({ countdown: '' });
  }
});
