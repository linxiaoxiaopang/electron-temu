const { LoopRequest } = require('~express/utils/loopUtils')
const { customIpcRenderer } = require('~utils/event')
const { getBatchReportingActivitiesData } = require('~express/controllers/batchReportingActivities/batchReportingActivities')
const { BuildSql, likeMatch } = require('~express/utils/sqlUtils')
const { flattenDeep, uniqBy } = require('lodash')

async function sync(req, res, next) {
  let { mallId, activityType, activityLabelTag, activityThematicId } = req.body
  if (!mallId) {
    res.customResult = [true, '请选择店铺']
    next()
    return
  }
  if (!activityType) {
    res.customResult = [true, '活动不能为空']
    next()
    return
  }
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
    activityType,
    rowCount: 50
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
        activityType,
        activityLabelTag,
        activityThematicId,
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

async function list(req, res, next) {
  const { body } = req
  let {
    page,
    filter = {},
    ...restFilter
  } = body
  const buildSqlInstance = new BuildSql({
    table: 'batchReportingActivities',
    selectModifier: 'DISTINCT',
    query: {
      ...filter,
      ...restFilter
    },
    column: [
      {
        label: '店铺Id',
        prop: 'mallId'
      },
      {
        label: '活动类型',
        prop: 'activityType'
      },
      {
        label: '活动标签',
        prop: 'activityLabelTag'
      },
      {
        label: '活动主题ID',
        prop: 'activityThematicId'
      },
      {
        label: 'SPU ID',
        prop: 'json:json.productId[op:in]',
        queryProp: 'spuId'
      },
      {
        label: 'SKC ID',
        prop: 'json:json.skcList[*].skcId[op:in]',
        queryProp: 'skcId'
      },
      {
        label: 'SKU ID',
        prop: 'json:json.skcList[*].skcList[*].skuList[*].skuId[op:in]',
        queryProp: 'skuId'
      },
      {
        label: 'SKC货号',
        prop: 'json:json.skcList[*].extCode[op:in]',
        queryProp: 'skcExtCode'
      },
      {
        label: 'SKC货号-模糊匹配',
        prop: 'json:json.skcList[*].extCode[op:in]',
        queryProp: 'skcExtCodeMatch',
        value(prop, query) {
          const item = query[this.prop]
          if (!item) return
          return likeMatch(item.matchType, item.matchContent)
        }
      },
      {
        label: 'SKU货号',
        prop: 'json:json.skcList[*].skcList[*].skuList[*].extCode[op:in]',
        queryProp: 'skuExtCode'
      },
      {
        label: 'SKU货号-模糊匹配',
        prop: 'json:json.skcList[*].skuList[*].extCode[op:like]',
        queryProp: 'skuExtCodeMatch',
        value(prop, query) {
          const item = query[prop]
          if (!item) return
          return likeMatch(item.matchType, item.matchContent)
        }
      },
      {
        label: '最小日常申报价格',
        prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].dailyPrice[op:>]',
        queryProp: 'dailyPriceRange',
        value(prop, query) {
          const item = query[prop]
          if (!item) return
          return item?.min || 0
        }
      },
      {
        label: '最大日常申报价格',
        prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].dailyPrice[op:<=]',
        queryProp: 'dailyPriceRange',
        value(prop, query) {
          const item = query[prop]
          if (!item) return
          return item?.max || 0
        }
      },
      {
        label: '最小参考申报价格',
        prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].suggestActivityPrice[op:>]',
        queryProp: 'suggestActivityPriceRange',
        value(prop, query) {
          const item = query[prop]
          if (!item) return
          return item?.min || 0
        }
      },
      {
        label: '最大参考申报价格',
        prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].suggestActivityPrice[op:<=]',
        queryProp: 'suggestActivityPriceRange',
        value(prop, query) {
          const item = query[prop]
          if (!item) return
          return item?.max || 0
        }
      },
      {
        prop: 'json:json.sites[*].siteId[op:in]',
        queryProp: 'semiManagedSiteIds'
      }
    ]
  })
  const sql = buildSqlInstance.generateSql()
  res.customResult = await customIpcRenderer.invoke('db:temu:batchReportingActivities:query', {
    sql,
    page,
    usedJsonProp: 'json'
  })
  next()
}

async function enrollSessionList(req, res, next) {
  const { body } = req
  const buildSqlInstance = new BuildSql({
    table: 'batchReportingActivities',
    selectModifier: 'DISTINCT',
    query: body,
    fields: [
      {
        prop: 'json:json.enrollSessionList',
        name: 'enrollSessionList'
      }
    ],
    column: [
      {
        label: '店铺Id',
        prop: 'mallId'
      },
      {
        label: '活动类型',
        prop: 'activityType'
      },
      {
        label: '活动主题ID',
        prop: 'activityThematicId'
      }
    ]
  })
  const sql = buildSqlInstance.generateSql()
  let [err, data] = await customIpcRenderer.invoke('db:temu:batchReportingActivities:query', {
    sql,
    usedJsonProp: 'enrollSessionList'
  })
  if (!err) data = uniqBy(flattenDeep(data), 'sessionId')
  res.customResult = [err, data]
  next()
}

module.exports = {
  sync,
  list,
  enrollSessionList
}
