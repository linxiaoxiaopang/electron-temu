const sequelize = require('../../db')
const { commonDefine } = require('../../const/pricingConfig')
module.exports = sequelize.define(
  'pricingConfigHistory',
  {
    ...commonDefine
  },
  {
    createdAt: 'createTime',
    updatedAt: 'updateTime',
    tableName: 'pricingConfigHistory'
  }
)

