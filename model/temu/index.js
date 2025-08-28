const batchReportingActivitiesModel = require('./batchReportingActivities/index')
const searchForChainSupplierModel = require('./searchForChainSupplier/index')
const bindBatchReportingActivitiesEvent = require('./batchReportingActivities/bindEvent')
const bindSearchForChainSupplierEvent = require('./searchForChainSupplier/bindEvent')

function bindEvent() {
  bindBatchReportingActivitiesEvent()
  bindSearchForChainSupplierEvent()
}

async function sync() {
  try {
    await batchReportingActivitiesModel.sync({ alter: true })
    await searchForChainSupplierModel.sync({ alter: true })
  } catch (err) {
    console.log('err', err)
  }
}

async function init() {
  bindEvent()
  await sync()
}


module.exports = {
  init
}
