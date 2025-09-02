const sequelize = require('../db')
const { commonPricingStrategyDefine } = require('../const/pricingStrategy')
module.exports = sequelize.define(
  'pricingStrategyHistory',
  {
    ...commonPricingStrategyDefine
  },
  {
    timestamps: false,
    tableName: 'pricingStrategyHistory'
  }
)

