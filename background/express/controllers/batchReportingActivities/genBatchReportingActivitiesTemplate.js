const { createProxyToGetTemuData } = require('../../middleware/proxyMiddleware')
const { getTemuTarget } = require('~store/user')


async function getGenBatchReportingActivitiesTemplateData(
  {
    req,
    query
  }
) {
  const relativeUrl0 = '/api/kiana/gamblers/marketing/enroll/semi/scroll/match'
  const wholeUrl0 = `${getTemuTarget()}${relativeUrl0}`
  const getData0 = createProxyToGetTemuData(req)
  const response0 = await getData0(wholeUrl0, { data: query })
  return response0
}

async function getActivityList(mallId) {
  const relativeUrl = '/api/kiana/gamblers/marketing/enroll/activity/list'
  const wholeUrl = `${getTemuTarget()}${relativeUrl}`
  const getData = createProxyToGetTemuData({
    body: {
      mallId,
      needCanEnrollCnt: true,
      needSessionItem: true
    }
  })
  return await getData(wholeUrl)
}

async function getThematicList(mallId) {
  const relativeUrl = '/api/kiana/gamblers/marketing/enroll/activity/thematic/list'
  const wholeUrl = `${getTemuTarget()}${relativeUrl}`
  const getData = createProxyToGetTemuData({
    body: {
      mallId
    }
  })
  return await getData(wholeUrl)
}


async function getActivityThematicList(mallId) {
  const p1 = getActivityList(mallId)
  const p2 = getThematicList(mallId)
  const pArr = [p1, p2]
  const [response1, response2] = await Promise.all(pArr)
  const activityTypeList = []
  const activityList = response1?.data?.activityList || []
  const thematicList = response2?.data?.activityThematicList || []
  activityTypeList.push(...activityList.filter(item => !item.thematicList?.length).map(item => {
    return {
      ...item,
      label: item.activityName,
      value: item.activityType
    }
  }))
  activityTypeList.push(...thematicList.map(item => {
    return {
      ...item,
      label: item.activityThematicName,
      value: `${item.activityType}-${item.activityThematicId}`
    }
  }))
  return activityTypeList
}

module.exports = {
  getGenBatchReportingActivitiesTemplateData,
  getActivityList,
  getThematicList,
  getActivityThematicList
}
