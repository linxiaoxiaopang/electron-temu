const { MALL_SOLE } = require('~store/user')
const { GetSemiSearchForChainSupplierData, GetFullSearchForChainSupplierData } = require('./utils/getFullSearchForChainSupplierData')

/**
 * SearchForChainSupplier 接口新增 priceReviewItem 项
 * @param req
 * @param query
 * @returns {Promise<*>}
 */
async function getFullSearchForChainSupplierData(
  {
    req,
    query
  }
) {
  const managedType = req.customData.managedType
  const list = {
    [MALL_SOLE.semiSole]: {
      classConstructor: GetSemiSearchForChainSupplierData
    },

    [MALL_SOLE.fullSole]: {
      classConstructor: GetFullSearchForChainSupplierData
    }
  }
  return new list[managedType].classConstructor({ req, query }).action()
}

module.exports = {
  getFullSearchForChainSupplierData
}
