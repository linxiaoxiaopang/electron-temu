const express = window.require('express')
const { updateCreatePricingStrategy } = require('@/express/controllers/verifyPrice')
const router = express.Router()

router.post('/getPricingStrategy', async (req, res, next) => {
  const { body } = req
  const skuIdList = body?.skuIdList || []
  res.customResult = await window.ipcRenderer.invoke('db:temu:pricingStrategy:find', {
    where: {
      skuId: {
        'op:in': skuIdList
      }
    }
  })
  res.noUseProxy = true
  next()
})

router.post('/getPricingStrategyHistory', async (req, res, next) => {
  const { body } = req
  const { mallId, page, ...where } = body
  res.customResult = await window.ipcRenderer.invoke('db:temu:pricingStrategyHistory:find', {
    where,
    page
  })
  res.noUseProxy = true
  next()
})

router.post('/updateCreatePricingStrategy', async (req, res, next) => {
  res.customResult = await updateCreatePricingStrategy(req)
  res.noUseProxy = true
  next()
})

router.post('/getPricingConfig', async (req, res, next) => {
  let [err, response] = await window.ipcRenderer.invoke('db:temu:pricingConfig:find', {
    where: {
      id: 1
    }
  })
  response = response?.[0]
  if (response) response.currentServeTimestamp = Date.now()
  res.customResult = [err, response]
  res.noUseProxy = true
  next()
})

router.post('/setPricingConfig', async (req, res, next) => {
  const { body } = req
  let [err, response] = await window.ipcRenderer.invoke('db:temu:pricingConfig:update', 1, {
    ...body,
    lastExecuteTime: Date.now()
  })
  if (!err) {
    const { id, ...rest } = response
    await window.ipcRenderer.invoke('db:temu:pricingConfigHistory:add', rest)
  }
  if (response) response.currentServeTimestamp = Date.now()
  res.customResult = [err, response]
  res.noUseProxy = true
  next()
})

router.post('/getPricingConfigHistory', async (req, res, next) => {
  const { body } = req
  const { mallId, page, ...where } = body
  res.customResult = await window.ipcRenderer.invoke('db:temu:pricingConfigHistory:find', {
    where,
    page
  })
  res.noUseProxy = true
  next()
})

module.exports = router
