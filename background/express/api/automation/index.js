const express = require('express')
const router = express.Router()

const { createApiFactory } = require('../../utils/apiUtils')
const apiFactory = createApiFactory(router)

apiFactory(require('./process'), 'process')

module.exports = router
