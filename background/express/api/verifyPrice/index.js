const express = require('express')
const router = express.Router()

const { createApiFactory } = require('../../utils/apiUtils')
const apiFactory = createApiFactory(router)

apiFactory(require('./pricingStrategy'))
apiFactory(require('./pricingConfig'))
apiFactory(require('./searchForChainSupplier'))
apiFactory(require('./styleMatchingPrice'))

module.exports = router
