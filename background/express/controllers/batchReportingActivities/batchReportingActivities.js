const { createProxyToGetTemuData } = require('../../middleware/proxyMiddleware')
const { getTemuTarget } = require('~store/user')
const { map } = require('lodash')

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

module.exports = {
  getBatchReportingActivitiesData
}
