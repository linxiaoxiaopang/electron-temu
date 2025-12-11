const { getTemuTarget, kuangjingmaihuo } = require('~store/user')
const { GetDeliveryOrdersFullData } = require('~express/controllers/shipping/getPageQueryDeliveryOrders')

async function list(req, res, next) {
  req.customOrigin = getTemuTarget(kuangjingmaihuo)
  const instance = new GetDeliveryOrdersFullData({ req })
  const response = await instance.action()
  res.customResult = [false, response?.data || [], { page: response.page }]
  next()
}

module.exports = {
  list
}
