const { LoopRequest } = require('~express/utils/loopUtils')
const { customIpcRenderer } = require('~utils/event')
const { getBatchReportingActivitiesData } = require('~express/controllers/batchReportingActivities/batchReportingActivities')

async function syncBatchReportingActivities(req, res, next) {
  let { mallId, activityType } = req.body
  if (!mallId) return [true, '请选择店铺']
  if (!activityType) return [true, '活动不能为空']
  const cacheKey = `${mallId}_syncBatchReportingActivities`
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
    activityType
  }
  instance.beforeLoopCallback = async () => {
    return await customIpcRenderer.invoke('db:temu:batchReportingActivities:delete', {
      where: {
        mallId
      }
    })
  }

  let totalTasks = 0
  instance.requestCallback = async () => {
    if (instance.summary.totalTasks == 0) {
      totalTasks = await getTotal()
      res.noUseProxy = true
      res.customResult = [false, {
        totalTasks,
        requestUuid: instance.uuid,
        completedTasks: 0
      }]
      next()
      return [false, {
        totalTasks,
        tasks: 0
      }]
    }
    const data = await getMoreData()
    const matchList = data?.data?.matchList || []
    const tasks = matchList.length
    const syncData = matchList.map(item => {
      return {
        mallId,
        json: item
      }
    })
    const response2 = await customIpcRenderer.invoke('db:temu:batchReportingActivities:add', syncData)
    if (response2[0]) return response2
    //所有数据都加载完毕
    if (data?.data?.hasMore) totalTasks = instance.summary.completedTasks + tasks
    return [false, {
      totalTasks,
      tasks
    }]
  }
  res.noUseProxy = true
  res.customResult = await instance.action()
  next()

  async function getTotal() {
    const response = await getBatchReportingActivitiesData({
      req,
      query: {
        ...query,
        rowCount: 1
      }
    })

    const total = (response?.data?.matchList?.length || 0) + (response?.data?.stillCount || 0)
    return total
  }

  async function getMoreData() {
    const response = await getBatchReportingActivitiesData({
      req,
      query
    })
    query.searchScrollContext = response?.data?.searchScrollContext
    return response
  }
}


module.exports = {
  syncBatchReportingActivities
}
