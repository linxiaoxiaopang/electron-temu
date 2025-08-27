const sequelize = require('../db')
const { DataTypes } = require('sequelize')

module.exports = sequelize.define(
  'batchReportingActivities',
  {
    json: {
      type: DataTypes.JSON,
      allowNull: false
    }
  },
  {
    timestamps: false,
    tableName: 'batchReportingActivities'
  }
)

