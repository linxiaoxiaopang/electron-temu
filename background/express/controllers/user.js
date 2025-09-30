const { customIpcRenderer } = require('~/utils/event')

async function getUserInfo(headers) {
  const { getTemuTarget, getIsProxy } = require('~store/user')
  let { Origin: origin } = headers
  if (getIsProxy()) {
    origin = getTemuTarget()
  }
  const wholeUrl = `${origin}/api/seller/auth/userInfo`
  const response = await customIpcRenderer.invoke('proxyRequest', {
    url: wholeUrl,
    method: 'POST',
    data: {},
    headers
  })
  return response?.data
}

module.exports = {
  getUserInfo
}
