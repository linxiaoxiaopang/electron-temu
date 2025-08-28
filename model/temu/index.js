const batchReportingActivitiesModel = require('./batchReportingActivities/index')
const searchForChainSupplierModel = require('./searchForChainSupplier/index')
const updateCreatePricingStrategyModel = require('./updateCreatePricingStrategy/index')
const bindBatchReportingActivitiesEvent = require('./batchReportingActivities/bindEvent')
const bindSearchForChainSupplierEvent = require('./searchForChainSupplier/bindEvent')
const bindUpdateCreatePricingStrategyEvent = require('./updateCreatePricingStrategy/bindEvent')

function bindEvent() {
  bindBatchReportingActivitiesEvent()
  bindSearchForChainSupplierEvent()
  bindUpdateCreatePricingStrategyEvent()
}

async function sync() {
  try {
    await batchReportingActivitiesModel.sync({ alter: true })
    await searchForChainSupplierModel.sync({ alter: true })
    await updateCreatePricingStrategyModel.sync({ alter: true })
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
