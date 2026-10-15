const { sync } = require('./utils/sync');
App({
  onLaunch() {
    if (wx.onNetworkStatusChange) wx.onNetworkStatusChange(event => { if (event.isConnected) this.requestSync(); });
  },
  onShow() { this.requestSync(); },
  requestSync() { return sync(); }
});
