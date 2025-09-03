const dayjs = require('dayjs')

// 1. 引入所需插件
const dayjsPluginUTC = require('dayjs-plugin-utc')
const timezonePlugin = require('dayjs-timezone-iana-plugin')

// 2. 关键步骤：注册插件（必须在使用前注册）
dayjs.extend(dayjsPluginUTC.default)    // 注册utc插件
dayjs.extend(timezonePlugin) // 注册timezone插件
function formatTime(time, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!time) time = Date.now()
  return dayjs(time).format(format)
}

function formatTimeZone(time, tz = 'Asia/Shanghai') {
  if (!time) time = Date.now()
  return dayjs.utc(time).tz(tz)
}

function formatTimeZoneAndTime(time, format = 'YYYY-MM-DD HH:mm:ss', tz = 'Asia/Shanghai') {
  if (!time) time = Date.now()
  return formatTime(formatTimeZone(time))
}

module.exports = {
  formatTime,
  formatTimeZone,
  formatTimeZoneAndTime
}
