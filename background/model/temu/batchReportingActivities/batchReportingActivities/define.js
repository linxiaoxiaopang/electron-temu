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
    },

    activityType: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '活动类型（限时秒杀等，对应业务字典）'
    },

    activityLabelTag: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '活动标签'
    },

    activityThematicId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: '活动主题ID（关联主题表，用于归类同主题活动）'
    }
  },
  {
    createdAt: 'createTime',
    updatedAt: 'updateTime',
    tableName: 'batchReportingActivities'
  }
)

