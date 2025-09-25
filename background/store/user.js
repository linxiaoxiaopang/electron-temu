const { getUserInfo } = require('~express/controllers/user')
const { emitter } = require('~utils/event')

const user = {
  apiMode: 'proxy',
  userInfo: null,
  headers: {}
}

exports.getApiMode = function () {
  return user.apiMode
}

exports.getIsProxy = function () {
  return exports.getApiMode() === 'proxy'
}

exports.getHeaders = function () {
  return user.headers
}

exports.getTemuTarget = function () {
  return exports.getIsProxy() ? 'http://192.168.10.81:3000/temu-agentseller' : 'https://agentseller.temu.com'
}

exports.user = user

emitter.on('getRequestHeaders', async (headers) => {
  let userInfo = null
  if (headers) userInfo = await getUserInfo({ method: 'POST', body: { headers } }, {})
  headers.mallid = userInfo?.mallList?.[0]?.mallId
  user.headers = headers
  user.userInfo = userInfo
})
