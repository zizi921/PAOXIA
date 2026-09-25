// Keep editable content below WeChat's native capsule, including large status bars.
function safeTop() {
  try {
    const capsule = wx.getMenuButtonBoundingClientRect();
    if (capsule && capsule.bottom > 0) return capsule.bottom + 20;
  } catch (error) {
    // Older runtimes use the stylesheet's conservative fallback.
  }
  return 96;
}
module.exports = { safeTop };
