const axios = require('axios')
const { createProxyToGetTemuData } = require('../../middleware/proxyMiddleware')
const { getTemuTarget } = require('~store/user')
const { map, isString, isFunction, isArray } = require('lodash')
const { flatMapDeepByArray } = require('~utils/array')
const { customIpcRenderer } = require('~utils/event')

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
    protocol,
    host,
    body,
    modify
  }
) {
  const { method, value, ...restBody } = body
  const relativeUrl = '/temu-agentseller/api/batchReportingActivities/activities/list'
  const wWholeUrl = `${protocol}://${host}${relativeUrl}`
  const response = await axios({
    method: 'post',
    url: wWholeUrl,
    data: restBody
  })
  let data = response?.data?.data || []
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
  return await customIpcRenderer.invoke('db:temu:batchReportingActivities:batchUpdate', data.map(item => {
    const { _dataBaseId, ...restItem } = item
    return {
      id: _dataBaseId,
      json: restItem
    }
  }))
}

module.exports = {
  getBatchReportingActivitiesData,
  batchModifyActivity
}
