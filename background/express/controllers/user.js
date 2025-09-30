const { customIpcRenderer } = require('~/utils/event')

async function getUserInfo(headers) {
  const { getTemuTarget } = require('~store/user')
  const wholeUrl = `${getTemuTarget()}/api/seller/auth/userInfo`
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
