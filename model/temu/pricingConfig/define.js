const sequelize = require('../db')
const { commonDefine } = require('../const/pricingConfig')
module.exports = sequelize.define(
  'pricingConfig',
  {
    ...commonDefine
  },
  {
    timestamps: false,
    tableName: 'pricingConfig'
  }
)

