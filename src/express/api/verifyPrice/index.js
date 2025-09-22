const express = window.require('express')
const router = express.Router()

const { createApiFactory } = require('@/express/utils/apiUtils')
const apiFactory = createApiFactory(router)

apiFactory(require('./pricingStrategy'))
apiFactory(require('./pricingConfig'))

module.exports = router
