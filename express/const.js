const { emitter } = require('../utils/event')
const { getUserInfo } = require('./controllers/user')

const store = {
  user: {
    apiMode: 'proxy',
    userInfo: null,
    headers: {}
  }
}

exports.getApiMode = function () {
  return store.user.apiMode
}

exports.getIsMock = function () {
  return exports.getApiMode() === 'mock'
}

exports.getIsProxy = function () {
  return exports.getApiMode() === 'proxy'
}

exports.getHeaders = function () {
  return store.user.headers
}

exports.getTemuTarget = function () {
  return exports.getIsProxy() ? 'http://192.168.10.81:3000/temu-agentseller' : 'https://agentseller.temu.com'
}

emitter.on('getRequestHeaders', async (headers) => {
  let userInfo = null
  if(headers) userInfo = await getUserInfo({ method: 'POST', body: { headers } }, {})
  headers.mallid = userInfo?.mallList?.[0]?.mallId
  store.user.headers = headers
  store.user.userInfo = userInfo
})
