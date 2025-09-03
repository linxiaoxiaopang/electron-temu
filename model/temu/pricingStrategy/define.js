const sequelize = require('../db')
const { commonDefine } = require('../const/pricingStrategy')
module.exports = sequelize.define(
  'pricingStrategy',
  {
    ...commonDefine
  },
  {
    createdAt: 'createTime',
    updatedAt: 'updateTime',
    tableName: 'pricingStrategy'
  }
)

