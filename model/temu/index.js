const batchReportingActivities = require('./batchReportingActivities/init')
const pricingConfig = require('./pricingConfig/init')
const pricingStrategy = require('./pricingStrategy/init')
const pricingStrategyHistory = require('./pricingStrategyHistory/init')
const searchForChainSupplier = require('./searchForChainSupplier/init')

async function init() {
  await batchReportingActivities.init()
  await pricingConfig.init()
  await pricingStrategy.init()
  await pricingStrategyHistory.init()
  await searchForChainSupplier.init()
}

module.exports = {
  init
}
