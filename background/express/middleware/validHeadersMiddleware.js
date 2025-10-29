const { getHeaders } = require('~store/user')
module.exports = function (req, res, next) {
  if(!req.body) req.body = {}
  const { mallId } = req.body || {}
  if(!mallId) return next()
  const headers = getHeaders(mallId)
  if (headers) return next()
  res.customResult = [true, 'headers 未获取']
  next()
}
