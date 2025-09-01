const sequelize = require('../db')
const { DataTypes } = require('sequelize')

module.exports = sequelize.define(
  'searchForChainSupplier',
  {
    json: {
      type: DataTypes.JSON,
      allowNull: false
    }
  },
  {
    timestamps: false,
    tableName: 'searchForChainSupplier'
  }
)

