const sequelize = require('../../db')
const { DataTypes } = require('sequelize')

module.exports = sequelize.define(
  'batchReportingActivities',
  {
    // mallId 字段（例如：商城ID、商户ID）
    mallId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: '店铺ID'
    },

    // json
    json: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'json数据'
    }
  },
  {
    createdAt: 'createTime',
    updatedAt: 'updateTime',
    tableName: 'batchReportingActivities'
  }
)

