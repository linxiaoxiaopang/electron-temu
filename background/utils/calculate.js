/* eslint-disable */
const Big = require('big.js')

/**
 * 数字相加
 * @param {Array} nums
 * @returns {Number}
 * @example see @/views/order/module/pushGroup.vue
 */
function numberAdd(nums) {
  return accAdd(...nums)
}

// 两位小数
function toFixed(num, precision) {
  return new Big(num).toFixed(precision)
}

function accFactory(method = 'plus') {
  return function (...nums) {
    nums = nums.map(Number).filter((num) => num || num === 0)
    if (nums.length < 2) return nums[0] || 0
    return Number(
      nums.slice(1).reduce((prev, num) => prev[method](num), new Big(nums[0]))?.toString()
    ) || 0
  }
}
// 浮点数求和
const accAdd = accFactory('plus')
// 浮点数相减
const accSub = accFactory('minus')
// 浮点数相除
const accDiv = accFactory('div')
// 浮点数相乘
const accMul = accFactory('times')

module.exports = {
  numberAdd,
  toFixed,
  accAdd,
  accSub,
  accDiv,
  accMul
}
