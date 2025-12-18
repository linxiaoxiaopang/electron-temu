const { customIpcRenderer } = require('~utils/event')
const { GetTemuProductData } = require('~express/controllers/automation/process')
const { BuildSql } = require('~express/utils/sqlUtils')

async function list(req, res, next) {
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
          }
        ]
      }
    ]
  })
  const sql = buildSqlInstance.generateSql()
  res.customResult = await customIpcRenderer.invoke('db:temu:automationProcess:query', {
    sql
  })
  next()
}

async function add(req, res, next) {
  const { data } = req.body
  if (!data.length) return [false, data]
  res.customResult = await customIpcRenderer.invoke('db:temu:automationProcess:add', data)
  next()
}

async function sync(req, res, next) {
  req.body.page = {
    pageIndex: 1,
    pageSize: 20
  }

  const instance = new GetTemuProductData({
    req,
    res
  })
  res.customResult = await instance.action()
  next()
}


module.exports = {
  list,
  add,
  sync
}
