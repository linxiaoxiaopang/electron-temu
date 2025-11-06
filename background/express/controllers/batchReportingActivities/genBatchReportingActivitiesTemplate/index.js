const { createProxyToGetTemuData } = require('~express/middleware/proxyMiddleware')
const { getTemuTarget, MALL_SOLE } = require('~store/user')
const {
  GetGenSemiBatchReportingActivitiesTemplateData,
  GetGenFullBatchReportingActivitiesTemplateData
} = require('~express/controllers/batchReportingActivities/genBatchReportingActivitiesTemplate/utils/getGenBatchReportingActivitiesTemplateData')

async function getGenBatchReportingActivitiesTemplateData(
  {
    req,
    query
  }
) {
  const managedType = req.customData.managedType
  const list = {
    [MALL_SOLE.semiSole]: {
      classConstructor: GetGenSemiBatchReportingActivitiesTemplateData
    },

    [MALL_SOLE.fullSole]: {
      classConstructor: GetGenFullBatchReportingActivitiesTemplateData
    }
  }
  return new list[managedType].classConstructor({ req, query }).action()
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
