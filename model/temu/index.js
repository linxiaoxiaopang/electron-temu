const batchReportingActivitiesModel = require('./batchReportingActivities/index')
const searchForChainSupplierModel = require('./searchForChainSupplier/index')
const pricingStrategyModel = require('./pricingStrategy/index')
const bindBatchReportingActivitiesEvent = require('./batchReportingActivities/bindEvent')
const bindSearchForChainSupplierEvent = require('./searchForChainSupplier/bindEvent')
const bindUpdateCreatePricingStrategyEvent = require('./pricingStrategy/bindEvent')

function bindEvent() {
  bindBatchReportingActivitiesEvent()
  bindSearchForChainSupplierEvent()
  bindUpdateCreatePricingStrategyEvent()
}

async function sync() {
  try {
    await batchReportingActivitiesModel.sync({ alter: true })
    await searchForChainSupplierModel.sync({ alter: true })
    await pricingStrategyModel.sync({ alter: true })
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
