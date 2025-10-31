const axios = require('axios')
const { map, isString, isFunction, isArray, merge } = require('lodash')
const { flatMapDeepByArray } = require('~utils/array')
const { customIpcRenderer } = require('~utils/event')
const { LoopRequest } = require('~express/utils/loopUtils')
const { getData } = require('~express/utils/apiUtils')

async function getBatchReportingActivitiesData(
  {
    req,
    query
  }
) {
  const response0 = await getData({
    relativeUrl: '/api/kiana/gamblers/marketing/enroll/scroll/match',
    req,
    query
  })
  const matchList = response0?.data?.matchList
  const productIds = map(matchList, 'productId')
  const p1 = getData({
    relativeUrl: '/api/kiana/gamblers/marketing/enroll/session/list',
    req,
    query: {
      productIds
    }
  })
  const p2 = getData({
    req,
    relativeUrl: '/api/kiana/mms/robin/searchForSemiSupplier',
    query: {
      pageNum: 1,
      pageSize: productIds.length,
      productSpuIdList: productIds,
      supplierTodoTypeList: []
    }
  })
  const [response1, response2] = await Promise.all([p1, p2])
  const productCanEnrollSessionMap = response1?.data?.productCanEnrollSessionMap || {}
  const dataList = response2?.data?.dataList || []
  matchList.map(item => {
    item.enrollSessionList = productCanEnrollSessionMap[item.productId] || []
  })
  dataList.map(item => {
    const flatSkcList = flatMapDeepByArray(item, ['skcList'])
    const flatSitePriceList = flatMapDeepByArray(flatSkcList, ['skuList', 'siteSupplierPriceList'])
    const fItem = matchList.find(sItem => item.productId == sItem.productId)
    if (!fItem) return
    traverseActivity({
      data: [fItem],
      productCallback(productItem) {
        const fItem = item
        const { catIdList, fullCategoryName, leafCategoryId, leafCategoryName } = fItem
        merge(productItem, {
          catIdList,
          fullCategoryName,
          leafCategoryId,
          leafCategoryName
        })
      },
      skcCallback(skcItem) {
        const fItem = flatSkcList.find(item => item.skcId == skcItem.skcId)
        if (!fItem) return
        const { statusTime } = fItem
        merge(skcItem, {
          statusTime
        })
      },
      siteCallback(sitePriceItem) {
        const fItem = flatSitePriceList.find(item => item.siteId == sitePriceItem.siteId)
        if (!fItem) return
        const { supplierPriceValue, supplierPrice } = fItem
        merge(sitePriceItem, {
          supplierPriceValue,
          supplierPrice
        })
      }
    })
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
  const response = await instance.action()
  if(response[0]) return response
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
