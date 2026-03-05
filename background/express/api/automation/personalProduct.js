const { customIpcRenderer } = require('~/utils/event')
const { BuildSql } = require('~express/utils/sqlUtils')

async function list(req, res, next) {
  const { body: { page } } = req
  const buildSqlInstance = new BuildSql({
    table: 'personalProduct',
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
            label: '定制sku',
            prop: 'personalProductSkuId[op:in]',
            queryProp: 'personalProductSkuIdList'
          }
        ]
      }
    ]
  })
  const sql = buildSqlInstance.generateSql()
  res.customResult = await customIpcRenderer.invoke('db:temu:personalProduct:query', {
    sql,
    page,
    jsonToObjectProps: ['json', 'processData', 'labelCustomizedPreviewItems']
  })
  next()
}

async function updateProcessData(req, res, next) {
  const { data } = req.body
  const filterData = data.filter(item => !item.errorMsg)
  const updateData = filterData.map(item => {
    const {
      dbProductId: id,
      productProcessData: processData,
      currentProcess: nextProcess,
      labelCustomizedPreviewItems,
      processList
    } = item
    const nextProcessIndex = processList.findIndex(item => item == nextProcess)
    const currentProcess = processList[nextProcessIndex - 1]
    if (!currentProcess) return
    processData[currentProcess] = labelCustomizedPreviewItems
    return {
      id,
      processData
    }
  }).filter(Boolean)
  if (!updateData.length) {
    res.customResult = [false, []]
  } else {
    res.customResult = await customIpcRenderer.invoke('db:temu:personalProduct:batchUpdate', updateData, false)
  }
  next()
}


module.exports = {
  list,
  updateProcessData
}
