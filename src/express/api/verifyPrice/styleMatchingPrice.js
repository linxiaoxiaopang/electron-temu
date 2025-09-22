async function getStyleMatchingPrice(req, res, next) {
  const { body } = req
  const { mallId, page, ...where } = body
  res.customResult = await window.ipcRenderer.invoke('db:temu:styleMatchingPrice:find', {
    where,
    page
  })
  res.noUseProxy = true
  next()
}

async function updateStyleMatchingPrice(req, res, next) {
  const { body } = req
  res.customResult = await window.ipcRenderer.invoke('db:temu:styleMatchingPrice:batchUpdate', body)
  res.noUseProxy = true
  next()
}

async function deleteStyleMatchingPrice(req, res, next) {
  const { body } = req
  res.customResult = await window.ipcRenderer.invoke('db:temu:styleMatchingPrice:delete', body)
  res.noUseProxy = true
  next()
}

async function createStyleMatchingPrice(req, res, next) {
  const { body } = req
  res.customResult = await window.ipcRenderer.invoke('db:temu:styleMatchingPrice:add', body)
  res.noUseProxy = true
  next()
}

module.exports = {
  getStyleMatchingPrice,
  updateStyleMatchingPrice,
  deleteStyleMatchingPrice,
  createStyleMatchingPrice
}
