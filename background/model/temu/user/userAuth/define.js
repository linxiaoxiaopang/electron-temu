const sequelize = require('../../db')
const { DataTypes } = require('sequelize')

module.exports = sequelize.define(
  'userAuth', // 模型名（对应表名）
  {
    // usernameId 字段（用户名唯一标识）
    usernameId: {
      type: DataTypes.STRING(50), // 字符串类型，长度50
      allowNull: false, // 不允许为空
      unique: true, // 唯一约束（避免重复）
      comment: '用户名唯一标识（如用户ID或用户名哈希）'
    },

    // passwordId 字段（密码加密后的标识）
    passwordId: {
      type: DataTypes.STRING(100), // 字符串类型，长度100（适配加密后的长字符串）
      allowNull: false, // 不允许为空
      comment: '密码'
    }
  },
  {
    createdAt: 'createTime', // 映射创建时间字段为 createTime
    updatedAt: 'updateTime', // 映射更新时间字段为 updateTime
    tableName: 'userAuth' // 数据库表名（推荐下划线命名）
  }
)

