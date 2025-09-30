const express = require('express')
const { getMallIds, getHeaders } = require('~store/user')
const { getUserInfo } = require('~express/controllers/user')
const router = express.Router()

router.post('/getMallList', async (req, res, next) => {
  const mallIds = getMallIds()
  res.noUseProxy = true
  if (!mallIds.length) {
    res.customResult = [true, '店铺信息为空']
    next()
    return
  }
  const pArr = mallIds.map(item => {
    const headers = getHeaders(item)
    return getUserInfo(headers)
  })
  const data = await Promise.all(pArr)
  res.customResult = [false, data]
  next()
})

module.exports = router
