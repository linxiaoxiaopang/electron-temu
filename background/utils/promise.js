const { isArray, isBoolean, isPlainObject } = require('lodash')

function isPromise(promise) {
  return promise instanceof Promise
}

async function throwPromiseError(response) {
  if (isPromise(response)) response = await response
  if (isPlainObject(response)) {
    if (isBoolean(response.success) && !response.success) throw response.errorMsg || '请求异常'
    if (response.message) throw response.message
    if (response?.data?.message) throw response.data.message
    return response
  }
  if (!isArray(response) || !isBoolean(response[0])) return response
  if (response[0]) throw response[1]
  return response[1]
}

module.exports = {
  throwPromiseError
}
