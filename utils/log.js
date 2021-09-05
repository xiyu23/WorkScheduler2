const log = wx.getRealtimeLogManager ? wx.getRealtimeLogManager() : null
const {
  __DEV__,
} = require('./config');

module.exports = {
  info() {
    __DEV__ && console.info(...arguments);
    if (!log) return

    log.info.apply(log, arguments)
  },
  warn() {
    __DEV__ && console.warn(...arguments);
    if (!log) return

    log.warn.apply(log, arguments)
  },
  error() {
    __DEV__ && console.error(...arguments);
    if (!log) return

    log.error.apply(log, arguments)
  },
  setFilterMsg(msg) { // 从基础库2.7.3开始支持
    if (!log || !log.setFilterMsg) return
    if (typeof msg !== 'string') return
    log.setFilterMsg(msg)
  },
  addFilterMsg(msg) { // 从基础库2.8.1开始支持
    if (!log || !log.addFilterMsg) return
    if (typeof msg !== 'string') return
    log.addFilterMsg(msg)
  }
}