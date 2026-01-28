const { customIpcRenderer } = require('~utils/event')
const { LoopGetTemuProductData, GetTemuProductData } = require('~express/controllers/automation/process')
const { BuildSql, likeMatch } = require('~express/utils/sqlUtils')
const { allRequestCache } = require('~express/utils/loopUtils')

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
            label: 'uId列表',
            prop: 'uId[op:in]',
            queryProp: 'uIdList'
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
  res.customResult = await customIpcRenderer.invoke('db:temu:automationProcess:query', {
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
  })
  next()
}

const allProcessList = [
  'product:all:下载Temu效果图',
  'product:all:下载Temu原图',
  'product:all:temu更换系统数据',
  'product:all:导入微定制订单',
  'label:picture:模板图像处理',
  'label:picture:切图',
  'label:picture:裁切透明像素',
  'label:picture:抠图',
  'label:picture:轮廓',
  'label:picture:高清放大',
  'label:picture:卡通',
  'label:picture:手动定制模板替换',
  'label:picture:定制模板替换',
  'product:all:上传原图',
  'product:all:创建产品',
  'product:all:上传文字校验',
  'product:all:上传预览图'
]

async function nodes(req, res, next) {
  res.customResult = [false, allProcessList]
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
  res.customResult = await customIpcRenderer.invoke('db:temu:automationProcess:batchUpdate', data)
  next()
}

async function sync(req, res, next) {
  if (req.body?.purchaseStartTime && req.body?.purchaseEndTime) {
    req.body.purchaseTimeFrom = +new Date(req.body.purchaseStartTime)
    req.body.purchaseTimeTo = +new Date(req.body.purchaseEndTime)
  }
  const instance = new LoopGetTemuProductData({
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
  res.customResult = [false, cacheData?.allSummary || []]
  next()
}

async function del(req, res, next) {
  res.customResult = await customIpcRenderer.invoke('db:temu:automationProcess:delete', {
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
  nodes,
  progress,
  compare
}
