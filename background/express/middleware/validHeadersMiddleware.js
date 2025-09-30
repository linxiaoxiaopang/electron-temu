const { getHeaders } = require('~store/user')
module.exports = function (req, res, next) {
  const { mallId } = req.body
  if(!mallId) return next()
  const headers = getHeaders(mallId)
  if (headers) return next()
  res.noUseProxy = true
  res.customResult = [true, 'headers 未获取']
  next()
}
