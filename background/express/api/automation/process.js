const { customIpcRenderer } = require('~utils/event')
const {
  LoopGetTemuProductData,
  GetTemuProductData,
  LoopGetTemuProductDataForImage,
  LoopGetTemuProductDataForVirtualOrder,
  LoopGetTemuProductDataForY2
} = require('~express/controllers/automation/process')
const { BuildSql, likeMatch } = require('~express/utils/sqlUtils')
const { allRequestCache } = require('~express/utils/loopUtils')
const { throwPromiseError } = require('~utils/promise')
const dayjs = require('dayjs')
const { map, isUndefined } = require('lodash')
const { localRequest } = require('~express/utils/apiUtils')
const { automationOrderTypeDic, allProcessNodesList } = require('~express/api/automation/const')

async function list(req, res, next) {
  const { body: { page } } = req
  const buildSqlInstance = new BuildSql({
    table: 'automationProcess',
    selectModifier: 'DISTINCT',
    query: req.body,
    group: [
      {
        column: [
          {
            label: '店铺Id',
            prop: 'mallId'
          },
          {
            label: '店铺Id列表',
            prop: 'mallId[op:in]',
            queryProp: 'mallIdList'
          },
          {
            label: '订单类型',
            prop: 'orderType[op:in]',
            queryProp: 'orderTypeList'
          },
          {
            label: '当前流程节点',
            prop: 'currentProcess[op:like]',
            value(prop, query) {
              const item = query.currentProcess
              if (!item) return
              return likeMatch('prefix', item)
            }
          },
          {
            label: '完成标识',
            prop: 'completeFlag',
            memberType: 'number'
          },
          {
            label: '备货单',
            prop: 'subPurchaseOrderSn[op:in]',
            queryProp: 'subPurchaseOrderSn'
          },
          {
            label: '虚拟备货单',
            prop: 'virtualSubPurchaseOrderSn[op:in]',
            queryProp: 'virtualSubPurchaseOrderSn'
          },
          {
            label: '备货单',
            prop: 'subPurchaseOrderSn[op:not]',
            queryProp: 'hasSubPurchaseOrderSn',
            value(prop, query) {
              const item = query.hasSubPurchaseOrderSn
              if (isUndefined(item)) return
              return null
            }
          },
          {
            label: 'uId列表',
            prop: 'uId[op:in]',
            queryProp: 'uIdList'
          },
          {
            label: '备货单创建开始时间',
            part: 'time',
            prop: 'purchaseTime[op:>=]',
            queryProp: 'purchaseStartTime',
            value(prop, query) {
              const item = query[prop]
              if (!item) return
              return +new Date(item)
            }
          },
          {
            label: '备货单创建开始时间',
            part: 'time',
            prop: 'purchaseTime[op:<=]',
            queryProp: 'purchaseEndTime',
            value(prop, query) {
              const item = query[prop]
              if (!item) return
              return +new Date(item)
            }
          },
          {
            label: '条码创建开始时间',
            part: 'time',
            logical: 'OR',
            partLogical: 'AND',
            prop: 'labelCreateTime[op:>=]',
            queryProp: 'labelCreateStartTime',
            value(prop, query) {
              const item = query[prop]
              if (!item) return
              return +new Date(item)
            }
          },
          {
            label: '条码创建开始时间',
            part: 'time',
            prop: 'labelCreateTime[op:<=]',
            queryProp: 'labelCreateEndTime',
            value(prop, query) {
              const item = query[prop]
              if (!item) return
              return +new Date(item)
            }
          }
        ]
      }
    ]
  })
  const sql = buildSqlInstance.generateSql()
  let pageResponse = undefined
  const res1 = await throwPromiseError(
    customIpcRenderer.invoke('db:temu:automationProcess:query', {
      sql,
      page,
      jsonToObjectProps: [
        'processList',
        'remainingProcessList',
        'temuData',
        'systemExchangeData',
        'processData',
        'labelCustomizedPreviewItems'
      ]
    }).then(response => {
      pageResponse = response?.[2]
      return response
    })
  )
  const relativeUrl = '/temu-agentseller/api/automation/personalProduct/list'
  const res2 = await throwPromiseError(
    localRequest(relativeUrl, {
      data: {
        mallId: req?.body?.mallId,
        personalProductSkuIdList: map(res1, 'personalProductSkuId')
      }
    })
  )
  res1.map(item => {
    const fItem = res2?.data?.find(sItem => sItem.personalProductSkuId === item.personalProductSkuId)
    item.dbProductId = fItem?.id
    item.temuData.productData = fItem?.json || null
    item.productProcessData = fItem?.processData || {}
  })
  res.customResult = [false, res1, pageResponse]
  next()
}

async function orderTypeList(req, res, next) {
  res.customResult = [false, automationOrderTypeDic]
  next()
}

async function nodes(req, res, next) {
  if (!req.body?.orderType) {
    res.customResult = [false, allProcessNodesList.default]
  } else {
    res.customResult = [false, allProcessNodesList[req.body.orderType] || []]
  }
  next()
}

async function add(req, res, next) {
  const { data } = req.body
  if (!data.length) return [false, data]
  res.customResult = await customIpcRenderer.invoke('db:temu:automationProcess:add', data, false)
  next()
}

async function update(req, res, next) {
  const { data } = req.body
  if (!data.length) return [false, data]
  await localRequest('/temu-agentseller/api/automation/personalProduct/updateProcessData', {
    data: {
      data
    }
  }).catch(err => {
    console.log('err', err)
  })
  res.customResult = await customIpcRenderer.invoke('db:temu:automationProcess:batchUpdate', data)
  next()
}

async function waitSync() {
  await customIpcRenderer.invoke('db:temu:automationProcess:waitValidateIsSync')
  await customIpcRenderer.invoke('db:temu:personalProduct:waitValidateIsSync')
}

async function sync(req, res, next) {
  if (req.body?.purchaseStartTime && req.body?.purchaseEndTime) {
    req.body.purchaseTimeFrom = +new Date(req.body.purchaseStartTime)
    req.body.purchaseTimeTo = +new Date(req.body.purchaseEndTime)
  }
  await waitSync()
  const instance = new LoopGetTemuProductData({
    req,
    res
  })
  res.customResult = await instance.action()
  next()
}

async function syncForImage(req, res, next) {
  if (!req.body.labelCreateStartTime) req.body.labelCreateStartTime = dayjs().subtract(3, 'days')
  if (!req.body.labelCreateEndTime) req.body.labelCreateEndTime = dayjs()
  if (!req.body.labelCreateTimeFrom) req.body.labelCreateTimeFrom = +new Date(req.body.labelCreateStartTime)
  if (!req.body.labelCreateTimeTo) req.body.labelCreateTimeTo = +new Date(req.body.labelCreateEndTime)

  await waitSync()

  const instance = new LoopGetTemuProductDataForImage({
    req,
    res
  })
  res.customResult = await instance.action()
  next()
}

async function syncForVirtualOrder(req, res, next) {
  if (!req.body.labelCreateStartTime) req.body.labelCreateStartTime = dayjs().subtract(3, 'days')
  if (!req.body.labelCreateEndTime) req.body.labelCreateEndTime = dayjs()
  if (!req.body.labelCreateTimeFrom) req.body.labelCreateTimeFrom = +new Date(req.body.labelCreateStartTime)
  if (!req.body.labelCreateTimeTo) req.body.labelCreateTimeTo = +new Date(req.body.labelCreateEndTime)

  await waitSync()

  const instance = new LoopGetTemuProductDataForVirtualOrder({
    req,
    res
  })
  res.customResult = await instance.action()
  next()
}

async function syncForY2(req, res, next) {
  if (req.body?.purchaseTimeFrom) req.body.purchaseStartTime = req.body.purchaseTimeFrom
  if (req.body?.purchaseTimeTo) req.body.purchaseEndTime = req.body.purchaseTimeTo
  if (!req.body?.purchaseStartTime) req.body.purchaseStartTime = dayjs().subtract(3, 'days').format('YYYY-MM-DD HH:mm:ss')
  if (!req.body?.purchaseEndTime) req.body.purchaseEndTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
  delete req.body?.purchaseTimeFrom
  delete req.body?.purchaseTimeTo
  req.body.parentOrderTimeStart = dayjs(req.body.purchaseStartTime).unix()
  req.body.parentOrderTimeEnd = dayjs(req.body.purchaseEndTime).unix()
  delete req.body?.purchaseEndTime
  delete req.body?.purchaseStartTime

  await waitSync()

  const instance = new LoopGetTemuProductDataForY2({
    req,
    res
  })
  res.customResult = await instance.action()
  next()
}

async function progress(req, res, next) {
  const { mallId } = req.body
  if (!mallId) throw '请选择店铺'
  const cacheKey = `automationProcessSync_${mallId}`
  const cacheData = allRequestCache[cacheKey]
  const keys = Object.keys(cacheData?.allSummary || {})
  let resItem = null
  for (let key of keys) {
    const item = cacheData.allSummary[key]
    if (!resItem) resItem = item
    if (resItem.dateStamp <= item.dateStamp) {
      resItem = item
    }
  }
  res.customResult = [false, resItem]
  next()
}

async function progressForImage(req, res, next) {
  const { mallId } = req.body
  if (!mallId) throw '请选择店铺'
  const cacheKey = `automationProcessSyncForImage_${mallId}`
  const cacheData = allRequestCache[cacheKey]
  const keys = Object.keys(cacheData?.allSummary || {})
  let resItem = null
  for (let key of keys) {
    const item = cacheData.allSummary[key]
    if (!resItem) resItem = item
    if (resItem.dateStamp <= item.dateStamp) {
      resItem = item
    }
  }
  res.customResult = [false, resItem]
  next()
}

async function progressForVirtualOrder(req, res, next) {
  const { mallId } = req.body
  if (!mallId) throw '请选择店铺'
  const cacheKey = `automationProcessSyncForVirtualOrder_${mallId}`
  const cacheData = allRequestCache[cacheKey]
  const keys = Object.keys(cacheData?.allSummary || {})
  let resItem = null
  for (let key of keys) {
    const item = cacheData.allSummary[key]
    if (!resItem) resItem = item
    if (resItem.dateStamp <= item.dateStamp) {
      resItem = item
    }
  }
  res.customResult = [false, resItem]
  next()
}

async function progressForY2(req, res, next) {
  const { mallId } = req.body
  if (!mallId) throw '请选择店铺'
  const cacheKey = `automationProcessSyncForY2_${mallId}`
  const cacheData = allRequestCache[cacheKey]
  const keys = Object.keys(cacheData?.allSummary || {})
  let resItem = null
  for (let key of keys) {
    const item = cacheData.allSummary[key]
    if (!resItem) resItem = item
    if (resItem.dateStamp <= item.dateStamp) {
      resItem = item
    }
  }
  res.customResult = [false, resItem]
  next()
}

async function del(req, res, next) {
  res.customResult = await customIpcRenderer.invoke('db:temu:automationProcess:delete', {
    where: {}
  })
  res.customResult = await customIpcRenderer.invoke('db:temu:personalProduct:delete', {
    where: {}
  })
  next()
}

async function compare(req, res, next) {
  const { body } = req
  const buildSqlInstance = new BuildSql({
    table: 'automationProcess',
    selectModifier: 'DISTINCT',
    query: body,
    fields: [
      {
        prop: 'subPurchaseOrderSn',
        name: 'total',
        valueFormatter(expr) {
          return `count(DISTINCT ${expr})`
        }
      }
    ],
    group: [
      {
        column: [
          {
            label: '店铺Id',
            prop: 'mallId'
          },
          {
            label: '备货单创建开始时间',
            prop: 'purchaseTime[op:>=]',
            queryProp: 'purchaseStartTime',
            value(prop, query) {
              const item = query[prop]
              if (!item) return
              return +new Date(item)
            }
          },
          {
            label: '备货单创建开始时间',
            prop: 'purchaseTime[op:<=]',
            queryProp: 'purchaseEndTime',
            value(prop, query) {
              const item = query[prop]
              if (!item) return
              return +new Date(item)
            }
          }
        ]
      }
    ]
  })
  const sql = buildSqlInstance.generateSql()
  const dbRes = await customIpcRenderer.invoke('db:temu:automationProcess:query', {
    sql
  })
  if (dbRes[0]) {
    res.customResult = dbRes
    return next()
  }
  req.body.page = {
    pageIndex: 1,
    pageSize: 1
  }
  const getTemuProductDataInstance = new GetTemuProductData({ req })
  const totalTasks = await getTemuProductDataInstance.getTotal()
  res.customResult = [
    false,
    {
      dbTotal: dbRes[1]?.[0]?.total,
      temuTotal: totalTasks
    }
  ]
  next()
}

module.exports = {
  list,
  add,
  del,
  update,
  sync,
  syncForImage,
  syncForVirtualOrder,
  syncForY2,
  nodes,
  orderTypeList,
  progress,
  progressForImage,
  progressForVirtualOrder,
  progressForY2,
  compare
}
