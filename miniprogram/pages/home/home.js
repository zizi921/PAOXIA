const { safeTop } = require('../../utils/layout');
const { readActiveRun } = require('../../utils/active-run');
const { readDraft } = require('../../utils/recap-draft');
const { readLanguage, saveLanguage, copyFor } = require('../../utils/i18n');
Page({
  data: { safeTop: 96, hasActiveRun: false, hasDraft: false, language: 'en', copy: copyFor('en', 'home') },
  onLoad() { this.setData({ safeTop: safeTop() }); },
  onShow() {
    try {
      const language = readLanguage();
      this.setData({ language, copy: copyFor(language, 'home'), hasActiveRun: !!readActiveRun(), hasDraft: !!readDraft() });
    } catch (error) {
      wx.showToast({ title: this.data.copy.loadError, icon: 'none' });
    }
  },
  chooseLanguage(event) {
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
    if (this.navigating) return;
    this.navigating = true;
    wx.navigateTo({
      url: '/pages/history/history',
      complete: () => { this.navigating = false; }
    });
  },
  go() {
    if (this.navigating) return;
    let activeRun;
    let draft;
    try {
      activeRun = readActiveRun();
      draft = readDraft();
    } catch (error) {
      wx.showToast({ title: this.data.copy.loadError, icon: 'none' });
      return;
    }
    this.navigating = true;
    const startedAt = activeRun ? activeRun.startedAt : Date.now();
    wx.navigateTo({
      url: !activeRun && draft ? '/pages/recap/recap' : `/pages/run/run?startedAt=${startedAt}`,
      complete: () => { this.navigating = false; }
    });
  }
});
