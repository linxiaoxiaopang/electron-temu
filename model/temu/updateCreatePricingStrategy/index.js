const sequelize = require('../db')
const { DataTypes } = require('sequelize')

module.exports = sequelize.define(
  'updateCreatePricingStrategy',
  {
    json: {
      type: DataTypes.JSON,
      allowNull: false
    }
  },
  {
    timestamps: false,
    tableName: 'updateCreatePricingStrategy'
  }
)

