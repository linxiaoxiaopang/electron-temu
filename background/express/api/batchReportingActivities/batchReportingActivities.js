const { LoopRequest } = require('~express/utils/loopUtils')
const { customIpcRenderer } = require('~utils/event')
const { getBatchReportingActivitiesData } = require('~express/controllers/batchReportingActivities/batchReportingActivities')
const { BuildSql, likeMatch } = require('~express/utils/sqlUtils')

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

async function getSyncBatchReportingActivities(req, res, next) {
  const { body } = req
  let { mallId, page, filter = {} } = body
  const buildSqlInstance = new BuildSql({
    table: 'batchReportingActivities',
    selectModifier: 'DISTINCT',
    query: {
      ...filter,
      mallId
    },
    column: [
      {
        prop: 'mallId',
        value: mallId
      },
      {
        prop: 'json:json.productName',
        queryProp: 'titleFiltering'
      },
      {
        prop: 'json:json.productId[op:in]',
        queryProp: 'spuId'
      },
      {
        prop: 'json:json.skcList[*].extCode[op:in]',
        queryProp: 'skcExtCode'
      },
      {
        prop: 'json:json.skcList[*].extCode[op:in]',
        queryProp: 'skcExtCodeMatch',
        value(prop, query) {
          const item = query[this.prop]
          if (!item) return
          return likeMatch(item.matchType, item.matchContent)
        }
      },
      {
        prop: 'json:json.skcList[*].skcList[*].skuList[*].extCode[op:in]',
        queryProp: 'skuExtCode'
      },
      {
        prop: 'json:json.skcList[*].skuList[*].extCode[op:like]',
        queryProp: 'skuExtCodeMatch',
        value(prop, query) {
          const item = query[prop]
          if (!item) return
          return likeMatch(item.matchType, item.matchContent)
        }
      },
      {
        prop: 'json:json.sites[*].siteId[op:in]',
        queryProp: 'semiManagedSiteIds'
      },
      {
        prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].dailyPrice[op:>]',
        queryProp: 'dailyPriceRange',
        value(prop, query) {
          const item = query[prop]
          if (!item) return
          return item?.min || 0
        }
      },
      {
        prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].dailyPrice[op:<=]',
        queryProp: 'dailyPriceRange',
        value(prop, query) {
          const item = query[prop]
          if (!item) return
          return item?.max || 0
        }
      },
      {
        prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].suggestActivityPrice[op:>]',
        queryProp: 'suggestActivityPriceRange',
        value(prop, query) {
          const item = query[prop]
          if (!item) return
          return item?.min || 0
        }
      },
      {
        prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].suggestActivityPrice[op:<=]',
        queryProp: 'suggestActivityPriceRange',
        value(prop, query) {
          const item = query[prop]
          if (!item) return
          return item?.max || 0
        }
      }
    ]
  })
  const sql = buildSqlInstance.generateSql()
  res.customResult = await customIpcRenderer.invoke('db:temu:batchReportingActivities:query', {
    sql,
    page
  })
  if (!res.customResult[0]) {
    res.customResult[1] = res.customResult[1].map(item => {
      return JSON.parse(item.json)
    })
  }
  res.noUseProxy = true
  next()
}

module.exports = {
  syncBatchReportingActivities,
  getSyncBatchReportingActivities
}
