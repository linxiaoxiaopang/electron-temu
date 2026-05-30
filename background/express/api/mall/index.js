const express = require('express')
const { getFlatMallList, getMall } = require('~store/user')
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

router.post('/store/headers', async (req, res, next) => {
  const { mallId } = req.body
  if (!mallId) {
    res.customResult = [true, 'mallId 不能为空']
    next()
    return
  }
  const mall = getMall(mallId)
  if (!mall) {
    res.customResult = [true, '店铺不存在']
    next()
    return
  }
  res.customResult = [false, mall?.headers]
  next()
})

module.exports = router
