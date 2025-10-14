const { isString, isFunction, isPlainObject } = require('lodash')

function buildSQL(sql, replacements = []) {
  for (let key in replacements) {
    const item = replacements[key]
    const keyword = escapeRegExp(key)
    const regex = new RegExp(`(?<![a-zA-Z0-9_])${keyword}(?![a-zA-Z0-9_])`, 'g')
    if (isString(item)) {
      sql = sql.replace(regex, item || '')
    }
    if (isFunction(item)) {
      sql = sql.replace(regex, item() || '')
    }
    if (isPlainObject(item)) {
      sql = sql.replace(regex, item.condition ? item.content : '')
    }
  }
  return sql
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

module.exports = {
  buildSQL,
  escapeRegExp
}
