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
    mallIds: {
      type: DataTypes.JSON, // 存储数组格式，如 [1001, 1002]
      allowNull: false,
      defaultValue: [], // 默认空数组
      comment: '适用的店铺ID列表'
    },
    // 调整：browserMode 改为数字类型，并添加验证规则
    browserMode: {
      type: DataTypes.TINYINT, // 使用TINYINT（微整型），更节省存储空间
      allowNull: false,
      defaultValue: 1, // 默认值为3（处理配置店铺）
      comment: '浏览器处理店铺的模式：1-一个浏览器处理一个店铺；2-一个浏览器处理所有店铺；3-一个浏览器处理配置店铺'
    },
    autoplay: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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

    // 新增：刷新Web页面的时间戳
    lastRefreshWebTimestamp: {
      type: DataTypes.BIGINT, // 统一用BIGINT存储毫秒级时间戳（避免溢出）
      allowNull: true,
      defaultValue: null,
      comment: '上次刷新Web页面的时间（毫秒级时间戳，1970-01-01 UTC起算）'
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
