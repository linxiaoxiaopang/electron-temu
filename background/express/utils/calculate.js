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
      return basic - basic * (value / 100)
    },

    [CALCULATE_TYPE_LIST.lowerThanFixed]() {
      return basic - value
    },

    [CALCULATE_TYPE_LIST.higherThanPercentage]() {
      return basic + basic * (value / 100)
    },

    [CALCULATE_TYPE_LIST.higherThanFixed]() {
      return basic + value
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
