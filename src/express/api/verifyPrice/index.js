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

router.post('/pricingStrategyHistory', async (req, res, next) => {
  const { body } = req
  const { mallId, page, ...rest } = body
  res.customResult = await window.ipcRenderer.invoke('db:temu:pricingStrategy:find', {
    where: rest,
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


router.post('/getPricingConfigAndStartPricing', async (req, res, next) => {
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

router.post('/setPricingConfigAndStartPricing', async (req, res, next) => {
  const { body } = req
  let [err, response] = await window.ipcRenderer.invoke('db:temu:pricingConfig:update', 1, {
    ...body,
    lastExecuteTime: Date.now()
  })
  response = response?.[0]
  if (response) response.currentServeTimestamp = Date.now()
  res.customResult = [err, response]
  res.noUseProxy = true
  next()
})

module.exports = router
