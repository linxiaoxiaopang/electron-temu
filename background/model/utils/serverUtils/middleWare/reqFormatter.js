const { cloneDeep, mergeWith, isFunction } = require('lodash')
const { Op, Sequelize } = require('sequelize')

const jsonExtract = (column, path) => {
  // 直接拼接 SQL 函数，避免 Sequelize 处理路径
  return Sequelize.literal(`json_extract(\`${column}\`, '${path}')`)
}

const METHOD_LIST = {
  op: Op,
  json(opName, objValue, obj) {
    // 分割JSON字段名和路径（如 "data.name" -> ["data", "name"]）
    const [field, ...paths] = opName.split('.')
    if (!field || paths.length === 0) {
      throw new Error('opName格式错误，应为"字段.路径"（如 "data.name"）')
    }

    const jsonPath = `$.${paths.join('.')}` // 构建JSON路径（如 $.name）

    // 生成Sequelize查询条件
    const condition = Sequelize.where(
      jsonExtract(field, jsonPath),
      objValue
    )
    // 将条件添加到目标对象（关键修复：直接用条件作为键）
    obj[Op.and] = condition
    return obj
  }
}

class ReqFormatter {
  constructor(ctx) {
    this.ctx = ctx
  }

  get req() {
    return this.ctx?.req
  }

  get where() {
    return this.req?.where || {}
  }

  get page() {
    return this.req?.page || {}
  }

  formatWhere() {
    const where = this.where
    const o1 = cloneDeep(where)
    const o2 = cloneDeep(where)
    const fns = []
    mergeWith(o1, o2, (objValue, srcValue, key, obj) => {
      if (key.indexOf(':') >= 0) {
        const [methodName, opName] = key.split(':')
        fns.push(() => {
          const method = METHOD_LIST[methodName]
          if (isFunction(method)) {
            method(opName, objValue, obj)
          } else {
            obj[method[opName]] = objValue
          }
          delete obj[key]
        })
      }
    })

    fns.map(item => item())
    return o1
  }

  formatPage() {
    const page = this.page
    if (!(page?.pageIndex && page?.pageSize)) return null
    const { pageIndex, pageSize } = page
    const offset = (pageIndex - 1) * pageSize
    return {
      offset,
      limit: pageSize
    }
  }

  action() {
    this.req.whereQuery = this.formatWhere()
    this.req.pageQuery = this.formatPage()
  }
}

module.exports = (ctx, next) => {
  new ReqFormatter(ctx).action()
  next()
}
