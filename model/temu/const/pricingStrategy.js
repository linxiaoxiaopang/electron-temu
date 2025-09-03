const { DataTypes } = require('sequelize')

const commonDefine = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true, // 自动增长
    comment: '数据库自增主键'
  },
  // 价格订单ID（核心字段）
  priceOrderId: {
    type: DataTypes.BIGINT, // 适配大数值ID（2508271407898996超出普通INT范围）
    allowNull: true,
    comment: '价格订单唯一标识ID'
  },
  // SKU唯一标识
  skuId: {
    type: DataTypes.BIGINT, // 使用BIGINT应对较大的ID值
    allowNull: true,
    comment: 'SKU唯一标识ID'
  },
  // 最小成本
  minCost: {
    type: DataTypes.INTEGER, // 成本为整数（单位可能为分）
    allowNull: true,
    comment: '最小成本'
  },
  // 最大成本
  maxCost: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '最大成本'
  },
  // 邮件ID
  mallId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: '关联的邮件ID'
  },
  // 是否关闭（0表示未关闭）
  isClose: {
    type: DataTypes.TINYINT, // 小整数类型，适合存储0/1状态
    allowNull: true,
    defaultValue: 0,
    comment: '是否关闭（0：未关闭，1：已关闭）'
  },
  // 固定价格标记
  priceFixed: {
    type: DataTypes.TINYINT,
    allowNull: true,
    defaultValue: 0,
    comment: '是否固定价格（0：否，1：是）'
  },
  // 价格百分比
  pricePercentage: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: '价格百分比'
  },
  // 最大定价数量（修正原数据中的小数点错误，假设为11）
  maxPricingNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '最大定价数量'
  },
  // 已经提交次数
  alreadyPricingNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '已经提交次数'
  }
}

module.exports = {
  commonDefine
}
