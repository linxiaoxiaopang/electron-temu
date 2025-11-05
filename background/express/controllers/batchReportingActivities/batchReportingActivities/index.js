const axios = require('axios')
const { isString, isFunction, isArray, merge } = require('lodash')
const { flatMapDeepByArray } = require('~utils/array')
const { customIpcRenderer } = require('~utils/event')
const { LoopRequest } = require('~express/utils/loopUtils')
const { MALL_SOLE } = require('~store/user')
const {
  GetSemiBatchReportingActivitiesDataClass,
  GetFullBatchReportingActivitiesDataClass
} = require('./utils/getBatchReportingActivitiesDataClass')

async function getBatchReportingActivitiesData(
  {
    req,
    query
  }
) {
  const managedType = req.customData.managedType
  const list = {
    [MALL_SOLE.semiSole]: {
      classConstructor: GetSemiBatchReportingActivitiesDataClass
    },

    [MALL_SOLE.fullSole]: {
      classConstructor: GetFullBatchReportingActivitiesDataClass
    }
  }
  return new list[managedType].classConstructor({ req, query }).action()
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
  const response = await instance.action()
  if (response[0]) return response
  response[1] = 1
  return response

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
    productCallback,
    skcCallback,
    skuCallback,
    siteCallback
  }
) {
  data.map(productItem => {
    if (productCallback) productCallback(productItem, data)
    productItem.skcList.map(skcItem => {
      if (skcCallback) skcCallback(skcItem, productItem, data)
      skcItem.skuList.map(skuItem => {
        if (skuCallback) skuCallback(skuItem, skcItem, productItem, data)
        skuItem.sitePriceList?.map(sitePriceItem => {
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
