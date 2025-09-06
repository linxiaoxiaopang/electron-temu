const express = window.require('express')
const axios = window.require('axios')
const { map } = require('lodash')
const { updateCreatePricingStrategy } = require('@/express/controllers/verifyPrice')
const { getTemuTarget, getIsMock } = require('@/express/const')
const { createProxyToGetTemuData } = require('@/express/middleware/proxyMiddleware')
const { getUUID } = require('@/utils/randomUtils')
const { LoopRequest } = require('@/express/utils/loopUtils')
const router = express.Router()

router.post('/getLatestPricingStrategy', async (req, res, next) => {
  const { body } = req
  const { startUpdateTime, endUpdateTime } = body
  const skuIdList = body?.skuIdList || []
  const where = {
    skuId: {
      'op:in': skuIdList
    }
  }
  if (startUpdateTime && endUpdateTime) {
    where.updateTime = {
      'op:between': [startUpdateTime, endUpdateTime]
    }
  }
  res.customResult = await window.ipcRenderer.invoke('db:temu:latestPricingStrategy:find', {
    where
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

router.post('/validatePricingStrategy', async (req, res, next) => {
  const { body, protocol, host } = req
  const { mallId, extCodeLike, startUpdateTime, endUpdateTime } = body

  const instance = new LoopRequest({
    req,
    res,
    cacheKey: 'validatePricingStrategy'
  })

  const query = {
    mallId,
    extCodeLike,
    page: {
      pageIndex: 1,
      pageSize: 50
    }
  }

  instance.requestCallback = async () => {
    const relativeUrl1 = '/temu-agentseller/api/verifyPrice/getSyncSearchForChainSupplier'
    const relativeUrl2 = '/temu-agentseller/api/verifyPrice/getLatestPricingStrategy'
    const wWholeUrl1 = `${protocol}://${host}${relativeUrl1}`
    const wWholeUrl2 = `${protocol}://${host}${relativeUrl2}`
    const response1 = await axios({
      method: 'post',
      url: wWholeUrl1,
      data: query
    })
    if (response1?.data?.code !== 0) return [false, response1.data?.message]
    const flatSkuList = []
    const totalTasks = response1?.data?.data?.total
    const dataList = response1?.data?.data?.dataList
    const tasks = dataList.length
    dataList.map(item => {
      const skcList = (item.skcList || [])
      skcList.map(sItem => {
        const skuList = (sItem.skuList || []).map(sItem => {
          return {
            ...sItem,
            extCode: item.extCode
          }
        })
        flatSkuList.push(...skuList)
      })
    })
    const response2 = await axios({
      method: 'post',
      url: wWholeUrl2,
      data: {
        startUpdateTime,
        endUpdateTime,
        skuIdList: map(flatSkuList, 'skuId')
      }
    })
    if (response2.data?.code !== 0) return [false, response2.data?.message]
    const response2Data = response2?.data?.data || []
    const errorData = flatSkuList.filter(item => response2Data.find(sItem => sItem.skuId == item.skuId))
    if (query.page.pageIndex == 1) {
      res.noUseProxy = true
      res.customResult = [false, {
        errorData,
        requestUuid: instance.uuid,
        totalTasks,
        completedTasks: tasks
      }]
      next()
    }
    query.page.pageIndex++
    return [false, {
      totalTasks,
      tasks,
      errorData
    }]
  }
  await instance.action()
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
