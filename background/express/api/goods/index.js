const express = require('express')
const router = express.Router()
const multer  = require('multer')
const upload = multer()

router.post('/proxyProductSkcPageQuery/upload', upload.single('image'), function (req, res, next) {
  req.body.image = req.file
  // req.body 包含文本域
  next()
})

const { createApiFactory } = require('../../utils/apiUtils')
const apiFactory = createApiFactory(router)

apiFactory(require('./proxyProductSkcPageQuery'), 'proxyProductSkcPageQuery')

module.exports = router
