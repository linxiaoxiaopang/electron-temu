const { customIpcRenderer } = require('~utils/event')
const { LoopGetTemuProductData } = require('~express/controllers/automation/process')
const { BuildSql } = require('~express/utils/sqlUtils')

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
            label: '当前流程节点',
            prop: 'currentProcess'
          },
          {
            label: '完成标识',
            prop: 'completeFlag',
            memberType: 'number'
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

async function add(req, res, next) {
  const { data } = req.body
  if (!data.length) return [false, data]
  res.customResult = await customIpcRenderer.invoke('db:temu:automationProcess:add', data)
  next()
}

async function update(req, res, next) {
  const { data } = req.body
  if (!data.length) return [false, data]
  res.customResult = await customIpcRenderer.invoke('db:temu:automationProcess:batchUpdate', data)
  next()
}

async function sync(req, res, next) {
  const instance = new LoopGetTemuProductData({
    req,
    res
  })
  res.customResult = await instance.action()
  next()
}


module.exports = {
  list,
  add,
  update,
  sync
}
