const batchReportingActivities = require('./batchReportingActivities/init')
const pricingConfig = require('./pricingConfig/init')
const pricingConfigHistory = require('./pricingConfigHistory/init')
const pricingStrategy = require('./pricingStrategy/init')
const latestPricingStrategy = require('./latestPricingStrategy/init')
const pricingStrategyHistory = require('./pricingStrategyHistory/init')
const searchForChainSupplier = require('./searchForChainSupplier/init')
const extCodeSearchForChainSupplier = require('./extCodeSearchForChainSupplier/init')

async function init() {
  await batchReportingActivities.init()
  await pricingConfig.init()
  await pricingConfigHistory.init()
  await pricingStrategy.init()
  await latestPricingStrategy.init()
  await pricingStrategyHistory.init()
  await searchForChainSupplier.init()
  await extCodeSearchForChainSupplier.init()
}

module.exports = {
  init
}
