const express = require('express')
const router = express.Router()

const { createApiFactory } = require('../../utils/apiUtils')
const apiFactory = createApiFactory(router)

apiFactory(require('./activities'), 'activities')
apiFactory(require('./genTemplate'), 'genTemplate')

module.exports = router
