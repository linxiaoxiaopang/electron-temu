const { isArray, isBoolean } = require('lodash')

function isPromise(promise) {
  return promise instanceof Promise
}

async function throwPromiseError(response) {
  if(isPromise(response)) response = await response
  if (!isArray(response) || !isBoolean(response[0])) return response
  if (response[0]) throw response[1]
  return response[1]
}

module.exports = {
  throwPromiseError
}
