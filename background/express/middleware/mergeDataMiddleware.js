const { merge } = require('lodash')
const { getMall, MALL_SOLE } = require('~store/user')
module.exports = function (req, res, next) {
  req.customData = {}
  if (!req?.body?.mallId) return next()
  const mall = getMall(req?.body?.mallId)
  if (!mall) return next()
  const managedType = mall?.userInfo?.mallList?.[0]?.managedType
  merge(req.customData, {
    managedType
  })
  next()
}
