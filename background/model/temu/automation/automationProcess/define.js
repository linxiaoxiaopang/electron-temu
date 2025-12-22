const sequelize = require('../../db')
const { DataTypes } = require('sequelize')
const { last, isArray, isString } = require('lodash')

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
    mallId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: '店铺ID'
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
      comment: '流程数组（存储各流程节点信息）',
      set(value) {
        this.setDataValue('processList', value)
        recalculateRemaining(this)
      }
    },
    currentProcess: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '当前流程节点（如：下单/审核/兑换/完成）',
      set(value) {
        this.setDataValue('currentProcess', value)
        recalculateRemaining(this)
        updateCompleteFlag(this)
      }
    },
    // 新增：存储型字段（需同步到数据库表结构）
    remainingProcessList: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: '自动生成：currentProcess之后的剩余流程节点（存储型）'
    },
    temuData: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Temu平台原始数据（JSON格式）'
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
      comment: '自定义预览项数组',
      // 验证：确保存入的是数组（可选）
      validate: {
        isArray(value) {
          if (value !== undefined && !Array.isArray(value)) {
            throw new Error('CustomizedPreviewItems 必须是数组格式')
          }
        }
      }
    },
    // 新增：purchaseTime 时间戳字段（核心）
    purchaseTime: {
      type: DataTypes.BIGINT, // 用BIGINT存储13位毫秒级时间戳（兼容前端/后端）
      allowNull: true,
      defaultValue: null,
      comment: '采购/下单时间戳（毫秒级，如1750000000000）',
      // 验证：确保是合法的数字型时间戳
      validate: {
        isInt: { msg: 'purchaseTime 必须是整数型时间戳' },
        min: { args: [1000000000000], msg: 'purchaseTime 必须是13位有效毫秒时间戳（≥2001年）' }
      }
    },
    // 新增：错误信息字段（核心）
    errorMsg: {
      type: DataTypes.TEXT, // 用TEXT存储，适配超长错误信息（如堆栈、详细日志）
      allowNull: true,
      defaultValue: '',
      comment: '流程执行错误信息：存储失败原因、异常堆栈、错误详情等',
      // 可选：长度限制（避免无意义的超长文本）
      validate: {
        len: {
          args: [0, 4096], // 最大4096字符，可根据业务调整
          msg: '错误信息长度不能超过4096个字符'
        }
      },
      set(value) {
        this.setDataValue('errorMsg', value)
        updateCompleteFlag(this)
      }
    }
  },
  {
    createdAt: 'createTime',
    updatedAt: 'updateTime',
    tableName: 'automationProcess',
    comment: '自动化流程表'
  }
)


function extractRemainingProcess(processList, currentProcess) {
  if (!isArray(processList) || !processList.length) return []
  if (!isString(currentProcess) || !currentProcess) return []

  const fIndex = processList.findIndex(item => item === currentProcess)
  if (fIndex === -1) return []
  return processList.slice(fIndex + 1)
}

// 统一计算方法
function recalculateRemaining(instance) {
  const processList = instance.getDataValue('processList')
  const currentProcess = instance.getDataValue('currentProcess')

  if (processList && currentProcess) {
    const remaining = extractRemainingProcess(processList, currentProcess)
    instance.setDataValue('remainingProcessList', remaining)
  }
}

function updateCompleteFlag(instance) {
  const processList = instance.getDataValue('processList')
  const currentProcess = instance.getDataValue('currentProcess')
  const errorMsg = instance.getDataValue('errorMsg')
  if (errorMsg) {
    instance.setDataValue('completeFlag', 2)
    return
  }
  if (processList && currentProcess && last(processList) == currentProcess) {
    instance.setDataValue('completeFlag', 1)
  }
}
