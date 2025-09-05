const sequelize = require('../db')
const { DataTypes } = require('sequelize')
const { commonDefine } = require('../const/pricingStrategy')
module.exports = sequelize.define(
  'latestPricingStrategy',
  {
    ...commonDefine,
    // 新增：报名次数字段
    registerCount: {
      type: DataTypes.INTEGER, // 整数类型，存储次数
      allowNull: false,
      defaultValue: 0, // 默认值为 0（未报名）
      comment: '用户报名活动的总次数' // 字段注释，便于维护
    }
  },
  {
    createdAt: 'createTime',
    updatedAt: 'updateTime',
    tableName: 'latestPricingStrategy'
  }
)

