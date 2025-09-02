const sequelize = require('../db')
const { DataTypes } = require('sequelize')

module.exports = sequelize.define(
  'pricingConfig',
  {
    // 自增主键
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '配置记录ID'
    },
    // 是否自动定价
    autoplay: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '是否启用自动定价功能'
    },
    // 是否对已发布商品定价
    isPricingAlreadyPublishedGoods: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否对已发布的商品进行定价'
    },
    // 循环时间（毫秒）
    interval: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60 * 1000 * 10,
      validate: {
        min: 60 * 1000 * 10 // 时间不低于10分钟
      },
      comment: '定价循环执行时间（毫秒），默认6天'
    },
    // 是否拒绝优先级
    rejectPriority: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否拒绝优先级定价'
    }
  },
  {
    timestamps: false,
    tableName: 'pricingConfig'
  }
)

