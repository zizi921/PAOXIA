const { safeTop } = require('../../utils/layout');
const { readActiveRun } = require('../../utils/active-run');
const { readDraft } = require('../../utils/recap-draft');
const { readLanguage, saveLanguage, copyFor } = require('../../utils/i18n');
const { shareAppMessage, shareTimeline, showShareMenu } = require('../../utils/share');
Page({
  onShareAppMessage: shareAppMessage,
  onShareTimeline: shareTimeline,
  data: { safeTop: 96, hasActiveRun: false, hasDraft: false, language: 'en', copy: copyFor('en', 'home') },
  onLoad() { this.setData({ safeTop: safeTop() }); },
  onShow() {
    this.navigating = false;
    showShareMenu(true);
    try {
      const language = readLanguage();
      this.setData({ language, copy: copyFor(language, 'home'), hasActiveRun: !!readActiveRun(), hasDraft: !!readDraft() });
    } catch (error) {
      wx.showToast({ title: this.data.copy.loadError, icon: 'none' });
    }
  },
  chooseLanguage(event) {
    if (this.navigating) return;
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
    this.openPage('/pages/history/history');
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
    const url = !activeRun && draft ? '/pages/recap/recap'
      : activeRun ? `/pages/run/run?startedAt=${activeRun.startedAt}` : '/pages/run/run';
    this.openPage(url);
  },
  openPage(url) {
    this.navigating = true;
    const failed = () => {
      this.navigating = false;
      wx.showToast({ title: this.data.copy.loadError, icon: 'none' });
    };
    try {
      wx.navigateTo({ url, fail: failed,
        complete: () => { this.navigating = false; } });
    } catch (error) {
      failed();
    }
  }
});
