const express = require('express')
const { getFlatMallList } = require('~store/user')
const { map } = require('lodash')
const router = express.Router()

router.post('/store/list', async (req, res, next) => {
  const mallList = getFlatMallList()
  if (!mallList.length) {
    res.customResult = [true, '店铺信息为空']
    next()
    return
  }
  res.customResult = [false, map(mallList, 'userInfo')]
  next()
})

module.exports = router
