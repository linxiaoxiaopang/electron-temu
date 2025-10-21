const { createProxyToGetTemuData } = require('../../middleware/proxyMiddleware')
const { getTemuTarget } = require('~store/user')

async function getBatchReportingActivitiesData(
  {
    req,
    query
  }
) {
  const relativeUrl0 = '/api/kiana/gamblers/marketing/enroll/scroll/match'
  const wholeUrl0 = `${getTemuTarget()}${relativeUrl0}`
  const getData0 = createProxyToGetTemuData(req)
  const response0 = await getData0(wholeUrl0, { data: query })
  return response0
}

module.exports = {
  getBatchReportingActivitiesData
}
