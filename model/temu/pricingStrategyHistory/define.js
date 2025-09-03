const sequelize = require('../db')
const { commonDefine } = require('../const/pricingStrategy')
module.exports = sequelize.define(
  'pricingStrategyHistory',
  {
    ...commonDefine
  },
  {
    timestamps: false,
    tableName: 'pricingStrategyHistory'
  }
)

