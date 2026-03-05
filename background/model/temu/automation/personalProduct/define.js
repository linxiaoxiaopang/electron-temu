const sequelize = require('../../db')
const { DataTypes } = require('sequelize')

module.exports = sequelize.define(
  'personalProduct',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键唯一标识'
    },
    mallId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: '店铺ID'
    },
    personalProductSkuId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
      comment: '定制 SKU'
    },
    json: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'JSON 数据'
    },
    processData: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: '流程扩展数据（JSON格式）：包含图片信息、上一次结果图片、流程附属数据等'
    },
    // 新增：Temu平台原始图片URL
    temuImageUrlDisplay: {
      type: DataTypes.STRING(512),
      allowNull: true,
      defaultValue: '',
      comment: 'Temu平台原始展示图片URL（如订单截图、商品图片等）'
    },
    // 新增：OSS存储的图片URL（系统内展示用）
    ossImageUrlDisplay: {
      type: DataTypes.STRING(512),
      allowNull: true,
      defaultValue: '',
      comment: '阿里云OSS存储的展示图片URL（Temu图片转存后地址）'
    },
    // 自定义预览项数组（核心字段）
    labelCustomizedPreviewItems: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [], // 默认空数组，避免null/undefined
      comment: '自定义预览项数组'
    }
  },
  {
    createdAt: 'createTime',
    updatedAt: 'updateTime',
    tableName: 'personalProduct',
    comment: '定制SKU表'
  }
)
