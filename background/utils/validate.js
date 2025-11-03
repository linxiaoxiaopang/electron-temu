const { isFunction, isEmpty } = require('lodash')

/**
 * 判断是否为空
 */
function validatenull(val) {
  if (typeof val == 'boolean') {
    return false
  }
  if (isFunction(val)) return false
  if (val instanceof Array) {
    if (val.length == 0) return true
  } else if (val instanceof Object) {
    // isEmpty会校验函数的参数长度
    if (isEmpty(val)) return true
  } else {
    if (
      val == 'null' ||
      val == null ||
      val == 'undefined' ||
      val == undefined ||
      val === ''
    )
      return true
    return false
  }
  return false
}

module.exports = {
  validatenull
}
