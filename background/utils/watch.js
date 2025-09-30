const { session } = require('electron')
const { emitter } = require('~/utils/event')

function watchUserInfo() {
  const filter = {
    urls: ['https://agentseller.temu.com/api/seller/auth/userInfo']
  }
  session.defaultSession.webRequest.onSendHeaders(filter, (details) => {
    const requestHeaders = details.requestHeaders
    emitter.emit('getRequestHeaders', requestHeaders)
  })
}

module.exports = {
  watchUserInfo
}
