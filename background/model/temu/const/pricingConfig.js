const { DataTypes } = require('sequelize')

const commonDefine =  {
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
      defaultValue: false,
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
        // min: 60 * 1000 * 10 // 时间不低于10分钟
        min: 0
      },
      comment: '定价循环执行时间（毫秒），默认6天'
    },
    // 新增：时间戳字段（核心）
    lastExecuteTimestamp: {
      type: DataTypes.BIGINT, // 毫秒级时间戳（整数）
      allowNull: true,
      defaultValue: null,
      comment: '上次成功执行定价的时间（毫秒级时间戳，1970-01-01 UTC起算）'
    },
    // 是否拒绝优先级
    rejectPriority: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否拒绝优先级定价'
    },
    // 整体处于执行中状态
    processing: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '整体处于执行中状态'
    },
    // 总任务量（如分页请求的总页数）
    totalTasks: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '总任务量（如总条数、总页数）'
    },
    // 已完成任务量
    completedTasks: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '已完成任务量'
    }
  }

module.exports = {
  commonDefine
}
