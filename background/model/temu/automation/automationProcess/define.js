const sequelize = require('../../db')
const { DataTypes } = require('sequelize')

module.exports = sequelize.define(
  'automationProcess',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键唯一标识'
    },
    uId: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      comment: '业务唯一标识（如Temu订单号/流程单号）'
    },
    completeFlag: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '完成标识 0-未完成 1-已完成 2-失败'
    },
    processList: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: '流程数组（存储各流程节点信息）'
    },
    temuData: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Temu平台原始数据（JSON格式）'
    },
    currentProcess: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '当前流程节点（如：下单/审核/兑换/完成）'
    },
    systemExchangeData: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Temu数据兑换后的系统内数据（JSON格式）'
    },
    processData: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: '流程扩展数据（JSON格式）：包含图片信息、上一次结果图片、流程附属数据等'
    }
  },
  {
    createdAt: 'createTime',
    updatedAt: 'updateTime',
    tableName: 'automationProcess',
    comment: '自动化流程表'
  }
)
