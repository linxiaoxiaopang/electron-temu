const sequelize = require('../../db')
const { DataTypes } = require('sequelize')

module.exports = sequelize.define(
  'automationConfig',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '配置记录ID'
    },
    autoplay: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '是否启用同步价功能'
    },
    // 循环时间（毫秒）
    interval: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60 * 1000 * 10,
      validate: {
        // min: 60 * 1000 * 10 // 时间不低于10分钟
        min: 0
      },
      comment: '定价循环执行时间（毫秒），默认10分钟'
    },
    // 时间戳字段（核心）
    lastExecuteTimestamp: {
      type: DataTypes.BIGINT, // 毫秒级时间戳（整数）
      allowNull: true,
      defaultValue: null,
      comment: '上次成功执行定价的时间（毫秒级时间戳，1970-01-01 UTC起算）'
    },

    // 备货单创建开始时间
    purchaseTimeFrom: {
      type: DataTypes.BIGINT, // 毫秒级时间戳（整数）
      allowNull: true,
      defaultValue: null,
      comment: '备货单创建结束时间'
    },

    // 备货单创建结束时间
    purchaseTimeTo: {
      type: DataTypes.BIGINT, // 毫秒级时间戳（整数）
      allowNull: true,
      defaultValue: null,
      comment: '备货单创建结束时间'
    },

    // 整体处于执行中状态
    processing: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '整体处于执行中状态'
    }
  },
  {
    createdAt: 'createTime',
    updatedAt: 'updateTime',
    tableName: 'automationConfig',
    comment: '自动化流程配置'
  }
)
