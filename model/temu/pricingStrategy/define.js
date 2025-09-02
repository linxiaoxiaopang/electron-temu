const sequelize = require('../db')
const { commonPricingStrategyDefine } = require('../const/pricingStrategy')
module.exports = sequelize.define(
  'pricingStrategy',
  {
    ...commonPricingStrategyDefine
  },
  {
    timestamps: false,
    tableName: 'pricingStrategy'
  }
)

