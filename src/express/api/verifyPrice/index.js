const express = window.require('express')
const axios = window.require('axios')
const { map, uniqBy } = require('lodash')
const { updateCreatePricingStrategy } = require('@/express/controllers/verifyPrice/updatePricingStrategy')
const { getFullSearchForChainSupplierData } = require('@/express/controllers/verifyPrice/searchForChainSupplier')
const { LoopRequest } = require('@/express/utils/loopUtils')
const router = express.Router()

router.post('/getLatestPricingStrategy', async (req, res, next) => {
  const { body } = req
  const { startUpdateTime, endUpdateTime, mallId } = body
  const skuIdList = body?.skuIdList || []
  const where = {
    mallId,
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
      pageSize: 200
    }
  }
  const errorData = []
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
      const skcList = item.skcList || []
      skcList.map(sItem => {
        const skuList = (sItem.skuList || []).map(gItem => {
          return {
            ...gItem,
            extCode: sItem.extCode
          }
        })
        flatSkuList.push(...skuList)
      })
    })
    const response2 = await axios({
      method: 'post',
      url: wWholeUrl2,
      data: {
        mallId,
        startUpdateTime,
        endUpdateTime,
        skuIdList: map(flatSkuList, 'skuId')
      }
    })
    if (response2.data?.code !== 0) return [false, response2.data?.message]
    const response2Data = response2?.data?.data || []
    const rawErrorData = flatSkuList.filter(item => !response2Data.find(sItem => sItem.skuId == item.skuId))
    const uniqErrorData = map(uniqBy(rawErrorData, 'extCode'), 'extCode')
    errorData.push(...uniqErrorData)
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
  res.noUseProxy = true
  res.customResult = await instance.action()
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

router.post('/getSearchForChainSupplier', async (req, res, next) => {
  const query = req.body
  const response = await getFullSearchForChainSupplierData({
    req,
    query
  })
  res.noUseProxy = true
  res.customResult = [false, response]
  next()
})

router.post('/syncSearchForChainSupplier', async (req, res, next) => {
  const { mallId } = req.body
  const instance = new LoopRequest({
    req,
    res,
    cacheKey: 'syncSearchForChainSupplier'
  })

  instance.beforeLoopCallback = async () => {
    return await window.ipcRenderer.invoke('db:temu:extCodeSearchForChainSupplier:clear')
  }

  const query = {
    pageSize: 100,
    pageNum: 1,
    supplierTodoTypeList: [1]
  }
  instance.requestCallback = async () => {
    const startPageNum = query.pageNum
    const data = await getMoreData()
    const dataList = data?.data?.dataList || []
    const totalTasks = data?.data?.total || 0
    const tasks = dataList.length
    const syncData = dataList.map(item => {
      return {
        mallId,
        json: item
      }
    })
    const response2 = await window.ipcRenderer.invoke('db:temu:extCodeSearchForChainSupplier:add', syncData)
    if (response2[0]) return response2
    if (startPageNum == 1) {
      res.noUseProxy = true
      res.customResult = [false, {
        totalTasks,
        requestUuid: instance.uuid,
        completedTasks: tasks
      }]
      next()
    }
    return [false, {
      totalTasks,
      tasks
    }]
  }
  res.noUseProxy = true
  res.customResult = await instance.action()
  next()

  async function getMoreData() {
    if (instance.summary.totalTasks == 0) {
      const response = await getFullSearchForChainSupplierData({
        req,
        query
      })
      query.pageNum++
      return response
    }
    const pArr = []
    const totalTasks = instance.summary.totalTasks
    let completedTasks = instance.summary.completedTasks
    for (let i = 0; i < 5; i++) {
      if (completedTasks >= totalTasks) continue
      const p = getFullSearchForChainSupplierData({
        req,
        query
      })
      query.pageNum++
      completedTasks += query.pageSize
      pArr.push(p)
    }
    const allData = await Promise.all(pArr)
    let response = null
    allData.map(item => {
      if (!response) {
        response = item
        return
      }
      const itemDataList = item?.data?.dataList || []
      if (response?.data?.dataList) response.data.dataList.push(...itemDataList)
    })
    return response
  }
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
