const sequelize = require('../db')
const { commonDefine } = require('../const/pricingStrategy')
module.exports = sequelize.define(
  'latestPricingStrategy',
  {
    ...commonDefine
  },
  {
    createdAt: 'createTime',
    updatedAt: 'updateTime',
    tableName: 'latestPricingStrategy'
  }
)

