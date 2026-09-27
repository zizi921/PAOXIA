// Always share the app, never a local record, timer, draft or page screenshot.
function shareContent(language) {
  return {
    title: language === 'zh' ? '跑下｜轻松跑步，记下沿途感受' : 'PAOXIA | Go for a run. Keep a little memory.',
    imageUrl: '/assets/runner.png'
  };
}

function shareAppMessage() {
  return { ...shareContent(this.data.language), path: '/pages/home/home' };
}

function shareTimeline() {
  // Timeline opens the current page, so only the home page registers this.
  return { ...shareContent(this.data.language), query: '' };
}

function showShareMenu(timeline = false) {
  if (typeof wx.showShareMenu !== 'function') return;
  wx.showShareMenu({ menus: timeline ? ['shareAppMessage', 'shareTimeline'] : ['shareAppMessage'] });
}

module.exports = { shareAppMessage, shareTimeline, showShareMenu };
