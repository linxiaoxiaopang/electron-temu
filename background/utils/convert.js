const { camelCase, isArray, transform, isPlainObject } = require('lodash')

/**
 * 深度遍历对象，将所有属性名从下划线转换为驼峰
 * @param {Object|Array} obj - 要转换的对象或数组
 * @returns {Object|Array} 转换后的新对象/数组
 */
function deepCamelCaseKeys(obj) {
  // 使用 transform 进行深度遍历和转换
  return transform(obj, (result, value, key) => {
    // 将当前键转换为驼峰命名
    const camelKey = camelCase(key)

    // 判断值的类型，进行递归处理
    if (isPlainObject(value)) {
      // 如果是纯对象，递归处理
      result[camelKey] = deepCamelCaseKeys(value)
    } else if (isArray(value)) {
      // 如果是数组，遍历数组元素并递归处理
      result[camelKey] = value.map(item => {
        return isPlainObject(item) || isArray(item)
          ? deepCamelCaseKeys(item)
          : item
      })
    } else {
      // 基本数据类型，直接赋值
      result[camelKey] = value
    }
  })
}


module.exports = {
  deepCamelCaseKeys
}
