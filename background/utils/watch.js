const { session, ipcMain } = require('electron')
const { emitter } = require('~/utils/event')
const servicePromise = require('~/utils/service')

function watchUserInfo() {
  const filter = {
    urls: ['https://agentseller.temu.com/api/seller/auth/userInfo']
  }
  session.defaultSession.webRequest.onSendHeaders(filter, (details) => {
    const requestHeaders = details.requestHeaders
    emitter.emit('getRequestHeaders', requestHeaders)
  })
}

function watchLogin() {
  const filter = {
    urls: ['https://seller.kuajingmaihuo.com/bg/quiet/api/mms/login']
  }
  let cacheUserInfo = {}
  ipcMain.handle('window:dom:loginInfo', (event, userInfo) => {
    cacheUserInfo = userInfo
  })

  session.defaultSession.webRequest.onCompleted(
    filter,
    async () => {
      if (!cacheUserInfo.usernameId || !cacheUserInfo.passwordId) return
      const service = await servicePromise
      const response = await service({
        method: 'post',
        url: '/temu-agentseller/api/user/userAuth/create',
        data: cacheUserInfo
      })
      return response
    }
  )
}

module.exports = {
  watchUserInfo,
  watchLogin
}
