const { customIpcRenderer } = require('~/utils/event')

async function getUserAuthList(req, res, next) {
  const { body } = req
  const { mallId, page, ...where } = body
  res.customResult = await customIpcRenderer.invoke('db:temu:userAuth:find', {
    where,
    page
  })
  next()
}

async function updateUserAuth(req, res, next) {
  const { body } = req
  res.customResult = await customIpcRenderer.invoke('db:temu:userAuth:batchUpdate', body)
  next()
}

async function createUserAuth(req, res, next) {
  const { body } = req
  res.customResult = await customIpcRenderer.invoke('db:temu:userAuth:add', body)
  next()
}

module.exports = {
  getUserAuthList,
  updateUserAuth,
  createUserAuth
}
