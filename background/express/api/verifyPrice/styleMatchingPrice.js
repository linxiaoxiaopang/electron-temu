const { customIpcRenderer } = require('~/utils/event')

async function getStyleMatchingPrice(req, res, next) {
  const { body } = req
  const { mallId, page, ...where } = body
  res.customResult = await customIpcRenderer.invoke('db:temu:styleMatchingPrice:find', {
    where,
    page
  })
  next()
}

async function updateStyleMatchingPrice(req, res, next) {
  const { body } = req
  res.customResult = await customIpcRenderer.invoke('db:temu:styleMatchingPrice:batchUpdate', body)
  next()
}

async function deleteStyleMatchingPrice(req, res, next) {
  const { body } = req
  res.customResult = await customIpcRenderer.invoke('db:temu:styleMatchingPrice:delete', {
    where: body
  })
  next()
}

async function createStyleMatchingPrice(req, res, next) {
  const { body } = req
  res.customResult = await customIpcRenderer.invoke('db:temu:styleMatchingPrice:add', body)
  next()
}

module.exports = {
  getStyleMatchingPrice,
  updateStyleMatchingPrice,
  deleteStyleMatchingPrice,
  createStyleMatchingPrice
}
