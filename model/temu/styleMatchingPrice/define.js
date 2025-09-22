const sequelize = require('../db')
const { DataTypes } = require('sequelize')

module.exports = sequelize.define(
  'styleMatchingPrice',
  {
    styleCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '款式编码'
    },

    currencyCode: {
      type: DataTypes.STRING(50), // 符合 ISO 4217 标准（USD/CNY 等）
      allowNull: false,
      comment: '币种编码'
    },

    price: {
      type: DataTypes.DECIMAL(10, 2), // 最大 10 位数字，2 位小数
      allowNull: false,
      validate: {
        min: 0 // 价格不能为负数
      },
      comment: '对应币种的价格'
    },
  },
  {
    createdAt: 'createTime',
    updatedAt: 'updateTime',
    tableName: 'styleMatchingPrice'
  }
)

