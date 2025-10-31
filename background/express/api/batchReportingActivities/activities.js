const { LoopRequest } = require('~express/utils/loopUtils')
const { customIpcRenderer } = require('~utils/event')
const {
  getBatchReportingActivitiesData, batchModifyActivity,
  traverseActivity
} = require('~express/controllers/batchReportingActivities/batchReportingActivities')
const { BuildSql, likeMatch } = require('~express/utils/sqlUtils')
const { flattenDeep, uniqBy, isNil } = require('lodash')
const { calculateByType, CALCULATE_TYPE_LIST } = require('~express/utils/calculate')

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
      item.suggestEnrollSessionIdList = []
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

const EFFECTIVE = 1
const INVALID = 2

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
    group: [
      {
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
              return item?.min
            }
          },
          {
            label: '最大日常申报价格',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].dailyPrice[op:<=]',
            queryProp: 'dailyPriceRange',
            value(prop, query) {
              const item = query[prop]
              if (!item) return
              return item?.max
            }
          },
          {
            label: '最小参考申报价格',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].suggestActivityPrice[op:>]',
            queryProp: 'suggestActivityPriceRange',
            value(prop, query) {
              const item = query[prop]
              if (!item) return
              return item?.min
            }
          },
          {
            label: '最大参考申报价格',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].suggestActivityPrice[op:<=]',
            queryProp: 'suggestActivityPriceRange',
            value(prop, query) {
              const item = query[prop]
              if (!item) return
              return item?.max
            }
          },
          {
            label: '最小日常申报价格减去参考申报价格的差值',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].dailyPrice[op:>]',
            queryProp: 'dailyPriceMinusSuggestActivityPrice',
            valueFormatter(value, { query }) {
              const item = query.dailyPriceMinusSuggestActivityPrice
              if (!item || isNil(item.min)) return
              return `${value} + ${item.min}`
            },
            value(prop, query) {
              const item = query[prop]
              if (!item || isNil(item.min)) return
              return `json:json.skcList[*].skuList[*].sitePriceList[*].suggestActivityPrice`
            }
          },
          {
            label: '最大日常申报价格减去参考申报价格的差值',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].dailyPrice[op:<=]',
            queryProp: 'dailyPriceMinusSuggestActivityPrice',
            valueFormatter(value, { query }) {
              const item = query.dailyPriceMinusSuggestActivityPrice
              if (!item || isNil(item.max)) return
              return `${value} + ${item.max}`
            },
            value(prop, query) {
              const item = query[prop]
              if (!item || isNil(item.max)) return
              return `json:json.skcList[*].skuList[*].sitePriceList[*].suggestActivityPrice`
            }
          },
          {
            label: '最小日常申报价格减去成本的差值',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].dailyPrice[op:>]',
            queryProp: 'dailyPriceMinusCost',
            valueFormatter(value, { query }) {
              const item = query.dailyPriceMinusCost
              if (!item || isNil(item.min)) return
              return `${value} + ${item.min}`
            },
            value(prop, query) {
              const item = query[prop]
              if (!item || isNil(item.min)) return
              return `json:json.skcList[*].skuList[*].sitePriceList[*].supplierPriceValue`
            }
          },
          {
            label: '最大日常申报价格减去成本的差值',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].dailyPrice[op:<=]',
            queryProp: 'dailyPriceMinusCost',
            valueFormatter(value, { query }) {
              const item = query.dailyPriceMinusCost
              if (!item || isNil(item.max)) return
              return `${value} + ${item.max}`
            },
            value(prop, query) {
              const item = query[prop]
              if (!item || isNil(item.max)) return
              return `json:json.skcList[*].skuList[*].sitePriceList[*].supplierPriceValue`
            }
          },
          {
            label: '最小参考申报价格减去成本的差值',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].suggestActivityPrice[op:>]',
            queryProp: 'suggestActivityPriceMinusCost',
            valueFormatter(value, { query }) {
              const item = query.suggestActivityPriceMinusCost
              if (!item || isNil(item.min)) return
              return `${value} + ${item.min}`
            },
            value(prop, query) {
              const item = query[prop]
              if (!item || isNil(item.min)) return
              return `json:json.skcList[*].skuList[*].sitePriceList[*].supplierPriceValue`
            }
          },
          {
            label: '最大参考申报价格减去成本的差值',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].suggestActivityPrice[op:<=]',
            queryProp: 'suggestActivityPriceMinusCost',
            valueFormatter(value, { query }) {
              const item = query.suggestActivityPriceMinusCost
              if (!item || isNil(item.max)) return
              return `${value} + ${item.max}`
            },
            value(prop, query) {
              const item = query[prop]
              if (!item || isNil(item.max)) return
              return `json:json.skcList[*].skuList[*].sitePriceList[*].supplierPriceValue`
            }
          },
          {
            label: '最小成本',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].supplierPriceValue[op:>]',
            queryProp: 'costPriceRange',
            value(prop, query) {
              const item = query[prop]
              if (!item) return
              return item?.min
            }
          },
          {
            label: '最大成本',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].supplierPriceValue[op:<=]',
            queryProp: 'costPriceRange',
            value(prop, query) {
              const item = query[prop]
              if (!item) return
              return item?.max
            }
          },
          {
            label: '商品规格',
            prop: 'json:json.skcList[*].skuList[*].颜色',
            queryProp: 'properties'
          },
          {
            label: '站点',
            prop: 'json:json.sites[*].siteId[op:in]',
            queryProp: 'semiManagedSiteIds'
          },
          {
            label: '类目',
            prop: 'json:json.leafCategoryId',
            queryProp: 'catId'
          },
          {
            label: '最小日常申报价格在参考申报价格的范围区间',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].dailyPrice[op:>]',
            queryProp: 'dailyPriceSuggestActivityPriceRatio',
            valueFormatter(value, { query }) {
              const item = query.dailyPriceSuggestActivityPriceRatio
              if (!item || isNil(item.min)) return
              return `${item.min / 100 * value} `
            },
            value(prop, query) {
              const item = query[prop]
              if (!item || isNil(item.min)) return
              return `json:json.skcList[*].skuList[*].sitePriceList[*].suggestActivityPrice`
            }
          },
          {
            label: '最大日常申报价格在参考申报价格的范围区间',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].dailyPrice[op:<=]',
            queryProp: 'dailyPriceSuggestActivityPriceRatio',
            valueFormatter(value, { query }) {
              const item = query.dailyPriceSuggestActivityPriceRatio
              if (!item || isNil(item.max)) return
              return `${item.max / 100 * value} `
            },
            value(prop, query) {
              const item = query[prop]
              if (!item || isNil(item.max)) return
              return `json:json.skcList[*].skuList[*].sitePriceList[*].suggestActivityPrice`
            }
          },
          {
            label: '最小日常申报价格在成本价格的范围区间',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].dailyPrice[op:>]',
            queryProp: 'dailyPriceCostRatio',
            valueFormatter(value, { query }) {
              const item = query.dailyPriceCostRatio
              if (!item || isNil(item.min)) return
              return `${item.min / 100 * value} `
            },
            value(prop, query) {
              const item = query[prop]
              if (!item || isNil(item.min)) return
              return `json:json.skcList[*].skuList[*].sitePriceList[*].supplierPriceValue`
            }
          },
          {
            label: '最大日常申报价格在成本价格的范围区间',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].dailyPrice[op:<=]',
            queryProp: 'dailyPriceCostRatio',
            valueFormatter(value, { query }) {
              const item = query.dailyPriceCostRatio
              if (!item || isNil(item.max)) return
              return `${item.max / 100 * value} `
            },
            value(prop, query) {
              const item = query[prop]
              if (!item || isNil(item.max)) return
              return `json:json.skcList[*].skuList[*].sitePriceList[*].supplierPriceValue`
            }
          },
          {
            label: '最小参考申报价格在成本价格的范围区间',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].suggestActivityPrice[op:>]',
            queryProp: 'suggestActivityPriceCostRatio',
            valueFormatter(value, { query }) {
              const item = query.suggestActivityPriceCostRatio
              if (!item || isNil(item.min)) return
              return `${item.min / 100 * value} `
            },
            value(prop, query) {
              const item = query[prop]
              if (!item || isNil(item.min)) return
              return `json:json.skcList[*].skuList[*].sitePriceList[*].supplierPriceValue`
            }
          },
          {
            label: '最大参考申报价格在成本价格的范围区间',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].suggestActivityPrice[op:<=]',
            queryProp: 'suggestActivityPriceCostRatio',
            valueFormatter(value, { query }) {
              const item = query.suggestActivityPriceCostRatio
              if (!item || isNil(item.max)) return
              return `${item.max / 100 * value} `
            },
            value(prop, query) {
              const item = query[prop]
              if (!item || isNil(item.max)) return
              return `json:json.skcList[*].skuList[*].sitePriceList[*].supplierPriceValue`
            }
          },
          {
            label: '活动场次',
            prop: 'json:json.enrollSessionList[*].sessionId',
            queryProp: 'sessionIds'
          },
          {
            label: '最小上架时间',
            prop: 'json:json.skcList[*].statusTime.addedToSiteTime[op:>]',
            queryProp: 'shelfDaysRange',
            value(prop, query) {
              const item = query[prop]
              if (!item) return
              return item?.min
            }
          },
          {
            label: '最大上架时间',
            prop: 'json:json.skcList[*].statusTime.addedToSiteTime[op:<=]',
            queryProp: 'shelfDaysRange',
            value(prop, query) {
              const item = query[prop]
              if (!item) return
              return item?.max
            }
          },
          {
            label: 'activityPrice小于suggestActivityPrice',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].activityPrice[op:<]',
            queryProp: 'effective',
            value(prop, query) {
              const item = query[prop]
              if (item != EFFECTIVE) return
              return 'json:json.skcList[*].skuList[*].sitePriceList[*].suggestActivityPrice'
            }
          },
          {
            label: 'activityPrice大于0',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].activityPrice[op:>]',
            queryProp: 'effective',
            value(prop, query) {
              const item = query[prop]
              if (item != EFFECTIVE) return
              return 0
            }
          }
        ]
      },
      {
        column: [
          {
            label: 'activityPrice小于suggestActivityPrice',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].activityPrice[op:>]',
            queryProp: 'effective',
            logical: 'OR',
            value(prop, query) {
              const item = query[prop]
              if (item != INVALID) return
              return 'json:json.skcList[*].skuList[*].sitePriceList[*].suggestActivityPrice'
            }
          },
          {
            label: 'activityPrice大于0',
            prop: 'json:json.skcList[*].skuList[*].sitePriceList[*].activityPrice[op:<]',
            queryProp: 'effective',
            value(prop, query) {
              const item = query[prop]
              if (item != INVALID) return
              return 0
            }
          }
        ]
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

async function validate(req, res, next) {
  const errorList = []
  req.body.effective = INVALID
  const response = await batchModifyActivity({
    req,
    res,
    ignoreUpdate: true,
    modify(
      {
        data
      }
    ) {
      traverseActivity({
        data,
        siteCallback(sitePriceItem, skuItem, skcItem, productItem) {
          errorList.push({
            spuId: productItem.productId,
            skcId: skcItem.skcId,
            skuId: skuItem.skuId,
            siteName: sitePriceItem.siteName,
            siteId: sitePriceItem.siteId,
            activityPrice: sitePriceItem.activityPrice,
            suggestActivityPrice: sitePriceItem.suggestActivityPrice
          })
        }
      })
    }
  })
  res.customResult = response[0] ? response : [false, errorList]
  next()
}

async function batchModifyActivityPrice(req, res, next) {
  const { body: { value, method } } = req
  const calculateList = {
    lowerThanSuggestActivityPricePercentage: (item) => {
      const { suggestActivityPrice } = item
      return calculateByType({
        value,
        type: CALCULATE_TYPE_LIST.lowerThanPercentage,
        basic: suggestActivityPrice
      })
    },
    lowerThanSuggestActivityPriceYuan: (item) => {
      const { suggestActivityPrice } = item
      return calculateByType({
        value,
        type: CALCULATE_TYPE_LIST.lowerThanFixed,
        basic: suggestActivityPrice
      })
    },
    lowerThanDailyPricePercentage: (item) => {
      const { dailyPrice } = item
      return calculateByType({
        value,
        type: CALCULATE_TYPE_LIST.lowerThanPercentage,
        basic: dailyPrice
      })
    },
    lowerThanDailyPriceYuan: (item) => {
      const { dailyPrice } = item
      return calculateByType({
        value,
        type: CALCULATE_TYPE_LIST.lowerThanFixed,
        basic: dailyPrice
      })
    },
    // higherThanCostPercentage: CALCULATE_TYPE_LIST.higherThanPercentage,
    // higherThanCostYuan: CALCULATE_TYPE_LIST.higherThanFixed,
    constantValue: () => {
      return calculateByType({
        value,
        type: CALCULATE_TYPE_LIST.constantValue,
        basic: value
      })
    }
  }
  const errorList = []
  const response = await batchModifyActivity({
    req,
    res,
    modify(
      {
        data
      }
    ) {
      traverseActivity({
        data,
        siteCallback(sitePriceItem, skuItem, skcItem, productItem) {
          sitePriceItem.activityPrice = calculateList[method](sitePriceItem)
          if (sitePriceItem.activityPrice < 0 || sitePriceItem.activityPrice > sitePriceItem.suggestActivityPrice) {
            errorList.push({
              spuId: productItem.productId,
              skcId: skcItem.skcId,
              skuId: skuItem.skuId,
              siteName: sitePriceItem.siteName,
              siteId: sitePriceItem.siteId,
              activityPrice: sitePriceItem.activityPrice,
              suggestActivityPrice: sitePriceItem.suggestActivityPrice
            })
          }
        }
      })
    }
  })
  res.customResult = response[0] ? response : [false, errorList]
  next()
}

async function batchModifyActivityStock(req, res, next) {
  const { body: { value, method } } = req
  const calculateList = {
    moreThanSuggestActivityStock: (item) => {
      const { suggestActivityStock } = item
      return calculateByType({
        value,
        type: CALCULATE_TYPE_LIST.higherThanPercentage,
        basic: suggestActivityStock
      })
    },
    constantValue: () => {
      return calculateByType({
        value,
        type: CALCULATE_TYPE_LIST.constantValue,
        basic: value
      })
    }
  }
  res.customResult = await batchModifyActivity({
    req,
    res,
    modify(
      {
        data
      }
    ) {
      data.map(item => {
        item.activityStock = calculateList[method](item)
      })
    }
  })
  next()
}

async function batchModifyActivityEnrollSession(req, res, next) {
  const { body: { value } } = req
  res.customResult = await batchModifyActivity({
    req,
    res,
    modify(
      {
        data
      }
    ) {
      data.map(item => {
        item.suggestEnrollSessionIdList = value || []
      })
    }
  })
  next()
}

module.exports = {
  sync,
  list,
  enrollSessionList,
  validate,
  batchModifyActivityPrice,
  batchModifyActivityStock,
  batchModifyActivityEnrollSession
}
