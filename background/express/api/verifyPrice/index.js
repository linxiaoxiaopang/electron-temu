const express = require('express')
const router = express.Router()

const { createApiFactory } = require('../../utils/apiUtils')
const apiFactory = createApiFactory(router)

apiFactory(require('./pricingConfig'), 'pricingConfig')
apiFactory(require('./pricingConfigHistory'), 'pricingConfigHistory')
apiFactory(require('./pricingStrategy'), 'pricingStrategy')
apiFactory(require('./pricingStrategyHistory'), 'pricingStrategyHistory')
apiFactory(require('./proxySearchForChainSupplier'), 'proxySearchForChainSupplier')
apiFactory(require('./searchForChainSupplier'), 'searchForChainSupplier')
apiFactory(require('./styleMatchingPrice'), 'styleMatchingPrice')

module.exports = router
