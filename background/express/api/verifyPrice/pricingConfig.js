const { customIpcRenderer } = require('~/utils/event')

async function getPricingConfig(req, res, next) {
  let [err, response] = await customIpcRenderer.invoke('db:temu:pricingConfig:find', {
    where: {
      id: 1
    }
  })
  response = response?.[0]
  if (response) response.currentServeTimestamp = Date.now()
  res.customResult = [err, response]
  next()
}

async function setPricingConfig(req, res, next) {
  const { body } = req
  let [err, response] = await customIpcRenderer.invoke('db:temu:pricingConfig:update', 1, {
    ...body,
    lastExecuteTimestamp: Date.now()
  })
  if (!err) {
    const { id, ...rest } = response
    await customIpcRenderer.invoke('db:temu:pricingConfigHistory:add', rest)
  }
  if (response) response.currentServeTimestamp = Date.now()
  res.customResult = [err, response]
  next()
}

async function getPricingConfigHistory(req, res, next) {
  const { body } = req
  const { mallId, page, ...where } = body
  res.customResult = await customIpcRenderer.invoke('db:temu:pricingConfigHistory:find', {
    where,
    page
  })
  next()
}

module.exports = {
  getPricingConfig,
  setPricingConfig,
  getPricingConfigHistory
}
