const { customIpcRenderer } = require('~/utils/event')

async function getUserInfo(headers) {
  const { getTemuTarget, getIsProxy } = require('~store/user')
  let { Origin: origin } = headers
  if (getIsProxy()) {
    origin = getTemuTarget()
  }
  let relativeUrl = '/api/seller/auth/userInfo'
  if(/seller.kuajingmaihuo.com/i.test(origin)) relativeUrl = '/bg/quiet/api/mms/userInfo'
  const wholeUrl = `${origin}${relativeUrl}`
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
