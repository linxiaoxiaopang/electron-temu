const { accAdd, accSub, accDiv, accMul } = require('~utils/calculate')
const CALCULATE_TYPE_LIST = {
  lowerThanPercentage: 'lowerThanPercentage',
  lowerThanFixed: 'lowerThanFixed',
  higherThanPercentage: 'higherThanPercentage',
  higherThanFixed: 'higherThanFixed',
  constantValue: 'constantValue'
}

function calculateByType(
  {
    type,
    basic,
    value
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

  return typeList[type]()
}

module.exports = {
  calculateByType,
  CALCULATE_TYPE_LIST
}
