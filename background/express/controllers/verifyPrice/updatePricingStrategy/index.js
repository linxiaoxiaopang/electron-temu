const { UpdateSemiPricingStrategy, UpdateFullPricingStrategy } = require('./utils/updateCreatePricingStrategy')
const { MALL_SOLE } = require('~store/user')

async function updateCreatePricingStrategy(req) {
  const managedType = req.customData.managedType
  const list = {
    [MALL_SOLE.semiSole]: {
      classConstructor: UpdateSemiPricingStrategy
    },

    [MALL_SOLE.fullSole]: {
      classConstructor: UpdateFullPricingStrategy
    }
  }
  return new list[managedType].classConstructor({ req }).action()
}

module.exports = {
  updateCreatePricingStrategy
}
