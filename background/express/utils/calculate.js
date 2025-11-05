const Big = require('big.js')
const { isString, isNil } = require('lodash')
const { accAdd, accSub, accDiv, accMul } = require('~utils/calculate')
const CALCULATE_TYPE_LIST = {
  lowerThanPercentage: 'lowerThanPercentage',
  lowerThanFixed: 'lowerThanFixed',
  higherThanPercentage: 'higherThanPercentage',
  higherThanFixed: 'higherThanFixed',
  constantValue: 'constantValue'
}

// 1. Big.roundDown（截断模式）
// 行为：向零方向舍入（直接截断多余位数，不四舍五入）。
// 示例：
// 123.456.round(2, Big.roundDown) → '123.45'（截断第三位小数）
// 123.999.round(0, Big.roundDown) → '123'（整数部分直接截断小数）
// 2. Big.roundUp（向上取整模式）
// 行为：向正无穷方向舍入（只要有多余位数，就向上进一位）。
// 示例：
// 123.451.round(2, Big.roundUp) → '123.46'（即使第三位小数是 1，仍进一位）
// 123.000.round(-1, Big.roundUp) → '130'（十位舍入时，只要个位非零就进一位）
// 3. Big.roundHalfUp（四舍五入模式，默认）
// 行为：当多余位数的第一位 ≥ 5 时向上进一位，否则截断（最常用的 “四舍五入”）。
// 示例：
// 123.455.round(2, Big.roundHalfUp) → '123.46'（第三位小数 5 进一位）
// 123.454.round(2, Big.roundHalfUp) → '123.45'（第三位小数 4 截断）
// 4. Big.roundHalfEven（银行家舍入模式）
// 行为：四舍五入的优化版，当多余位数的第一位是 5 时：
// 若前一位是偶数，则截断（不进位）；
// 若前一位是奇数，则进位（使结果为偶数，减少累计误差）。
// 用途：金融、统计等对精度要求高的场景，减少多次舍入的累积误差。
// 示例：
// 123.455.round(2, Big.roundHalfEven) → '123.46'（前一位是 5 奇数，进位为 6 偶数）
// 123.445.round(2, Big.roundHalfEven) → '123.44'（前一位是 4 偶数，截断）

function calculateByType(
  {
    type,
    basic,
    value,
    digits = 0,
    mode = 'roundDown',
    keepFalsy = true
  }
) {
  const typeList = {
    [CALCULATE_TYPE_LIST.lowerThanPercentage]() {
      return accSub(basic, accMul(basic, accDiv(value, 100)))
      // return basic - basic * (value / 100)
    },

    [CALCULATE_TYPE_LIST.lowerThanFixed]() {
      return accSub(basic, value)
      // return basic - value
    },

    [CALCULATE_TYPE_LIST.higherThanPercentage]() {
      return accAdd(basic, accMul(basic, accDiv(value, 100)))
      // return basic + basic * (value / 100)
    },

    [CALCULATE_TYPE_LIST.higherThanFixed]() {
      return accAdd(basic, value)
      // return basic + value
    },

    [CALCULATE_TYPE_LIST.constantValue]() {
      return value
    }
  }
  if (keepFalsy && ((isString(value) && !value) || isNil(value))) return value
  return +new Big(typeList[type]()).toFixed(digits, Big[mode])
}

module.exports = {
  calculateByType,
  CALCULATE_TYPE_LIST
}
