const { customIpcRenderer } = require('~/utils/event')

async function getUserAuthList(req, res, next) {
  const { body } = req
  const { mallId, page, ...where } = body
  res.customResult = await customIpcRenderer.invoke('db:temu:userAuth:find', {
    where,
    page
  })
  res.noUseProxy = true
  next()
}

async function updateUserAuth(req, res, next) {
  const { body } = req
  res.customResult = await customIpcRenderer.invoke('db:temu:userAuth:batchUpdate', body)
  res.noUseProxy = true
  next()
}

async function createUserAuth(req, res, next) {
  const { body } = req
  res.customResult = await customIpcRenderer.invoke('db:temu:userAuth:add', body)
  res.noUseProxy = true
  next()
}

module.exports = {
  getUserAuthList,
  updateUserAuth,
  createUserAuth
}
