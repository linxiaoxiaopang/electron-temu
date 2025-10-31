const axios = require('axios')
const { createProxyToGetTemuData } = require('../../middleware/proxyMiddleware')
const { getTemuTarget } = require('~store/user')
const { map, isString, isFunction, isArray } = require('lodash')
const { flatMapDeepByArray } = require('~utils/array')
const { customIpcRenderer } = require('~utils/event')
const { LoopRequest } = require('~express/utils/loopUtils')

async function getBatchReportingActivitiesData(
  {
    req,
    query
  }
) {
  const relativeUrl0 = '/api/kiana/gamblers/marketing/enroll/scroll/match'
  const relativeUrl1 = '/api/kiana/gamblers/marketing/enroll/session/list'
  const wholeUrl0 = `${getTemuTarget()}${relativeUrl0}`
  const wholeUrl1 = `${getTemuTarget()}${relativeUrl1}`
  const getData0 = createProxyToGetTemuData(req)
  const response0 = await getData0(wholeUrl0, { data: query })
  const matchList = response0?.data?.matchList
  const productIds = map(matchList, 'productId')
  const getData1 = createProxyToGetTemuData(req)
  const response1 = await getData1(wholeUrl1, {
    data: {
      productIds
    }
  })
  const productCanEnrollSessionMap = response1?.data?.productCanEnrollSessionMap || {}
  matchList.map(item => {
    item.enrollSessionList = productCanEnrollSessionMap[item.productId] || []
  })
  return response0
}

async function batchModifyActivity(
  {
    req,
    res,
    ignoreUpdate,
    modify
  }
) {
  const { protocol, host, body } = req
  const { method, value, ...restBody } = body
  const cacheKey = `${restBody.mallId}_batchModifyActivity`
  const instance = new LoopRequest({
    req,
    res,
    cacheKey
  })
  //放弃之前通过cacheKey的实例请求
  if (!req.body?.requestUuid) {
    await instance.abandonCacheInstanceRequest()
  }
  const query = {
    ...restBody,
    page: {
      pageIndex: 1,
      pageSize: 1000
    }
  }
  instance.requestCallback = async () => {
    const response = await getData(query)
    const totalTasks = response?.data?.page?.total || 0
    let data = response?.data?.data
    const tasks = data.length
    if (isString(modify)) modify = modify.split('.')
    if (isArray(modify)) {
      const prop = modify.pop()
      const flatData = flatMapDeepByArray(data, modify)
      flatData.map(item => {
        item[prop] = value
      })
    }
    if (isFunction(modify)) {
      const result = await modify({
        data,
        value,
        method,
        getFlatData: (props) => {
          return flatMapDeepByArray(data, props)
        }
      })
      if (result) data = result
    }
    if (!ignoreUpdate) {
      const response1 = await customIpcRenderer.invoke('db:temu:batchReportingActivities:batchUpdate', data.map(item => {
        const { _dataBaseId, ...restItem } = item
        return {
          id: _dataBaseId,
          json: restItem
        }
      }))
      if (response1[0]) throw response1[1]
    }
    query.page.pageIndex++
    return [false, {
      totalTasks,
      tasks
    }]
  }
  return await instance.action()

  async function getData() {
    return await getBatchReportingActivitiesList({
      protocol,
      host,
      query
    })
  }
}

function traverseActivity(
  {
    data,
    skcCallback,
    skuCallback,
    siteCallback
  }
) {
  data.map(productItem => {
    productItem.skcList.map(skcItem => {
      if (skcCallback) skcCallback(skcItem, productItem, data)
      skcItem.skuList.map(skuItem => {
        if (skuCallback) skuCallback(skuItem, skcItem, productItem, data)
        skuItem.sitePriceList.map(sitePriceItem => {
          if (siteCallback) siteCallback(sitePriceItem, skuItem, skcItem, productItem, data)
        })
      })
    })
  })
}

async function getBatchReportingActivitiesList(
  {
    protocol,
    host,
    query
  }
) {
  const relativeUrl = '/temu-agentseller/api/batchReportingActivities/activities/list'
  const wWholeUrl = `${protocol}://${host}${relativeUrl}`
  const response = await axios({
    method: 'post',
    url: wWholeUrl,
    data: query
  })
  return response
}

module.exports = {
  getBatchReportingActivitiesData,
  batchModifyActivity,
  traverseActivity
}
