const express = window.require('express')
const axios = window.require('axios')
const { updateCreatePricingStrategy } = require('@/express/controllers/verifyPrice')
const { getTemuTarget, getIsMock } = require('@/express/const')
const { createProxyToGetTemuData } = require('@/express/middleware/proxyMiddleware')
const { getUUID } = require('@/utils/randomUtils')
const router = express.Router()

router.post('/getLatestPricingStrategy', async (req, res, next) => {
  const { body } = req
  const skuIdList = body?.skuIdList || []
  res.customResult = await window.ipcRenderer.invoke('db:temu:latestPricingStrategy:find', {
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
    lastExecuteTimestamp: Date.now()
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

const allSyncSearchForChainSupplierResponse = {}

router.post('/syncSearchForChainSupplier', async (req, res, next) => {
  const { body } = req
  const { mallId, requestUuid } = body
  if (requestUuid) {
    const response = allSyncSearchForChainSupplierResponse[requestUuid]
    res.customResult = [false, {
      totalTasks: response.total || 0,
      completedTasks: response.current || 0
    }]
    next()
    return
  }

  if (getIsMock()) {
    res.customResult = [false, {
      totalTasks: 0,
      completedTasks: 0
    }]
    next()
    return
  }

  const relativeUrl = '/api/kiana/mms/robin/searchForSemiSupplier'
  const wholeUrl = `${getTemuTarget()}${relativeUrl}`
  const getData = createProxyToGetTemuData(req)
  const query = {
    pageSize: 50,
    pageNum: 1,
    supplierTodoTypeList: [1]
  }
  const response = {
    total: 0,
    current: 0
  }
  const uuid = getUUID()
  await window.ipcRenderer.invoke('db:temu:extCodeSearchForChainSupplier:clear')
  do {
    const data = await getData(wholeUrl, { data: query })
    const dataList = data?.data?.dataList || []
    response.total = data?.data?.total || 0
    response.current += dataList.length
    const syncData = dataList.map(item => {
      return {
        mallId,
        json: item
      }
    })
    await window.ipcRenderer.invoke('db:temu:extCodeSearchForChainSupplier:add', syncData)
    if (query.pageNum == 1) {
      res.noUseProxy = true
      allSyncSearchForChainSupplierResponse[uuid] = response
      res.customResult = [false, {
        requestUuid: uuid,
        totalTasks: response.total,
        completedTasks: response.current
      }]
      next()
    }
    query.pageNum++
  } while (response.total > response.current)
  delete allSyncSearchForChainSupplierResponse[uuid]
})

router.post('/getSyncSearchForChainSupplier', async (req, res, next) => {
  const { body } = req
  let { mallId, page, extCodeLike } = body

  const sql = `SELECT DISTINCT t.* 
FROM extCodeSearchForChainSupplier t,
     json_each(json_extract(t.json, '$.skcList')) AS item
WHERE json_extract(item.value, '$.extCode') like :pattern and t.mallId = :mallId`

  res.customResult = await window.ipcRenderer.invoke('db:temu:extCodeSearchForChainSupplier:query', {
    sql,
    page,
    replacements: {
      mallId,
      pattern: extCodeLike ? `%${extCodeLike}%` : '%'
    }
  })
  if (!res.customResult[0]) {
    res.customResult[1] = {
      dataList: res.customResult[1].map(item => {
        return JSON.parse(item.json)
      }),
      total: res.customResult[2]?.page?.total
    }
  }
  res.noUseProxy = true
  next()
})

router.post('/updateCreatePricingStrategyPassSetting', async (req, res, next) => {
  const { body, protocol, host } = req
  const {
    allSettings,
    strategyList,
    ...query
  } = body
  const relativeUrl = '/temu-agentseller/api/verifyPrice/getSyncSearchForChainSupplier'
  const wholeUrl = `${protocol}://${host}${relativeUrl}`
  const response = await axios({
    method: 'post',
    url: wholeUrl,
    data: query
  })
  const dataList = response?.data?.data?.dataList || []
  res.customResult = [false, dataList]
  res.noUseProxy = true
  next()
})

module.exports = router
