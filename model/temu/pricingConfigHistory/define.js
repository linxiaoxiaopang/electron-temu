const sequelize = require('../db')
const { commonDefine } = require('../const/pricingConfig')
module.exports = sequelize.define(
  'pricingConfigHistory',
  {
    ...commonDefine
  },
  {
    timestamps: false,
    tableName: 'pricingConfigHistory'
  }
)

