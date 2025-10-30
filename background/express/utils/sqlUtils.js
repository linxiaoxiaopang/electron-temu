const { isString, isFunction, cloneDeep, isUndefined, isArray, isPlainObject } = require('lodash')


class BuildSql {
  constructor(option = {}) {
    this.option = this.handleOption(cloneDeep(option))
    this.joinCache = new Map()
    this.joinCounter = 0
    this.joins = []
    this.mask = {
      array: '[*]',
      json: 'json:',
      tablePrefix: 'je_'
    }
    this.opReg = /\[op:([^\[\]]+)\]$/
  }

  get table() {
    return this.option?.table
  }

  get column() {
    return this.option?.column || []
  }

  get fields() {
    return this.option?.fields || [{
      prop: `${this.table}.*`,
      name: `${this.table}.*`
    }]
  }

  get selectModifier() {
    return this.option?.selectModifier || ''
  }

  get where() {
    return this.column.reduce((acc, cur) => {
      const {
        prop,
        value
      } = cur
      acc[prop] = value
      return acc
    }, {})
  }

  get handleSql() {
    if (this.option?.handleSql) return this.option?.handleSql
    return function (
      {
        selectFields,
        table,
        joinSql,
        whereSql,
        selectModifier
      }) {
      return `SELECT ${selectModifier} ${selectFields} FROM ${table} ${joinSql} ${whereSql}`
    }
  }

  handleOption(option) {
    const { query, column } = option
    column.map(item => {
      let { queryProp, prop } = item
      queryProp = queryProp || prop
      if (isFunction(item.value)) {
        item.value = item.value(queryProp, query, this)
        return
      }
      if (!queryProp || !query || item.value) return
      item.value = query[queryProp] || item.value
    })
    option.column = column.filter(item => !isUndefined(item.value))
    if (isArray(option.fields)) {
      option.fields = option.fields.map(item => {
        if (isPlainObject(item)) {
          if (!item.prop) throw `column ${item.prop} is not exist`
          if(!item.name) item.name = item.prop
          return item
        }
        return {
          prop: item,
          name: item
        }
      })
    }
    return option
  }

  /**
   * 递归解析多层 JSON 数组路径（支持多级 [*]）
   * @param {string} path - 如 "skcList[*].skuList[*].productName"
   * @returns {Object} 解析结果 { baseColumn, arrayLayers, finalProp }
   *   - baseColumn: 基础 JSON 字段（如 "json"）
   *   - arrayLayers: 数组层级列表（如 [{ path: 'skcList' }, { path: 'skuList' }]）
   *   - finalProp: 最终属性（如 "productName"）
   */
  parseMultiArrayPath(path) {
    const firstDotIndex = path.indexOf('.')
    if (firstDotIndex === -1) {
      return {
        baseColumn: `${this.table}.${path}`,
        arrayLayers: [],
        finalProp: ''
      }
    }

    const baseColumn = `${this.table}.${path.slice(0, firstDotIndex)}`
    let remainingPath = path.slice(firstDotIndex + 1)
    const arrayLayers = []

    while (remainingPath.includes(this.mask.array)) {
      const arrayEndIndex = remainingPath.indexOf(this.mask.array)
      const arrayPath = remainingPath.slice(0, arrayEndIndex)
      arrayLayers.push({ path: arrayPath })
      // 修正：跳过 "[*]" 后，若还有剩余字符且第一个是 ".", 再跳过 "."
      remainingPath = remainingPath.slice(arrayEndIndex + 3)
      if (remainingPath.startsWith('.')) {
        remainingPath = remainingPath.slice(1)
      }
    }

    const finalProp = remainingPath

    return { baseColumn, arrayLayers, finalProp }
  }


  /**
   * 生成多层数组展开的 JOIN 语句和属性提取表达式
   * @param {Object} parsed - 解析后的路径信息（parseMultiArrayPath 的返回值）
   * @param {number} startIndex - 起始索引（避免别名冲突）
   * @returns {Object} { joins, extractExpr, lastAlias }
   *   - joins: JOIN 语句数组
   *   - extractExpr: 提取最终属性的 SQL 表达式
   *   - lastAlias: 最后一层数组的别名
   */
  generateArrayJoins(parsed) {
    const { baseColumn, arrayLayers, finalProp } = parsed
    const joins = []
    let currentSource = baseColumn // 初始数据源为基础字段
    let currentAlias

    // 为每层数组生成 JOIN 语句
    arrayLayers.forEach(layer => {
      const arrayPathKey = `${currentSource}.${layer.path}`
      const joinCache = this.joinCache
      if (joinCache.has(arrayPathKey)) {
        // 复用已缓存的JOIN信息（避免重复生成）
        const cached = joinCache.get(arrayPathKey)
        currentAlias = cached.alias
        currentSource = cached.source // 更新数据源为缓存的别名.value
      } else {
        // 新数组路径：生成JOIN语句并缓存
        this.joinCounter++ // 引用传递，确保计数器全局唯一
        currentAlias = `${this.mask.tablePrefix}${this.joinCounter}` // 生成唯一别名（如 je1, je2）
        const jsonPath = `'$.${layer.path}'` // JSON路径（如 '$.skcList'）
        const joinSql = `JOIN json_each(${currentSource}, ${jsonPath}) AS ${currentAlias}`

        // 缓存当前数组路径信息（用于后续复用）
        const newSource = `${currentAlias}.value` // 下一层数据源
        joinCache.set(arrayPathKey, { alias: currentAlias, source: newSource })

        // 添加到本次JOIN列表
        joins.push(joinSql)
        currentSource = newSource // 更新数据源
      }
    })
    // 生成最终属性的提取表达式
    let extractExpr
    if (finalProp) {
      // 从最后一层数组元素中提取属性（如 je2.value -> '$.productName'）
      extractExpr = `json_extract(${currentSource}, '$.${finalProp}')`
    } else {
      // 无最终属性，直接返回最后一层数组元素
      extractExpr = currentSource
    }

    return { joins, extractExpr, lastAlias: currentAlias }
  }

  escapeValue(value) {
    if (isArray(value)) return value.map(item => this.escapeValue(item))
    if (isString(value)) return `'${value.replace(/'/g, "''")}'`
    return value
  }

  generateWhereClauses() {
    const { where } = this
    const whereClauses = []
    const whereFieldJoins = []
    // 处理 WHERE 条件
    Object.entries(where).forEach(([key, value]) => {
      // 步骤1：解析路径中的 [op=操作符] 标识
      let pathWithOp = key
      let operator = ''
      const opReg = this.opReg
      const opMatch = pathWithOp.match(opReg) // 匹配 [op=>] 格式

      if (opMatch) {
        operator = opMatch[1] // 提取操作符（如 '>'）
        pathWithOp = pathWithOp.replace(opReg, '') // 移除标识，保留纯路径
      }
      if (isArray(value)) operator = operator || 'IN'
      operator = operator || '='
      // 步骤2：兼容原有键尾操作符解析（若路径中无op标识则使用）
      let field = pathWithOp

      // 步骤3：处理NULL特殊情况
      if (value === null && operator === '=') {
        operator = 'IS'
      }

      // 步骤4：处理参数值（添加单引号等区分符号）
      let processedValue = value

      if (isString(value)) {
        processedValue = this.escapeValue(value) // 转义单引号
      }

      if (/^in$/ig.test(operator)) {
        processedValue = `(${this.escapeValue(value)})`
      }

      // 步骤5：解析JSON路径并生成条件
      if (field.startsWith(this.mask.json)) {
        const jsonPath = field.slice(5)
        const parsed = this.parseMultiArrayPath(jsonPath) // 复用之前的路径解析函数
        const { arrayLayers, baseColumn, finalProp } = parsed
        if (arrayLayers.length === 0) {
          const expr = finalProp
            ? `json_extract(${baseColumn}, '$.${finalProp}')`
            : baseColumn
          whereClauses.push(`${expr} ${operator} ${processedValue}`)
        } else {
          const { joins: whereJoins, extractExpr } = this.generateArrayJoins(parsed)
          whereFieldJoins.push(...whereJoins)
          whereClauses.push(`${extractExpr} ${operator} ${processedValue}`)
        }
      } else {
        // 普通字段条件
        whereClauses.push(`${field} ${operator} ${processedValue}`)
      }
    })
    this.updateJoins(whereFieldJoins)
    return whereClauses
  }

  formatFields() {
    let fields = this.fields
    const fieldsJoins = []
    fields = fields.map(field => {
      const { prop, name } = field
      if (prop.startsWith(this.mask.json)) {
        const jsonPath = prop.slice(5) // 提取 "json.skcList[*].skuList[*].productName"
        const parsed = this.parseMultiArrayPath(jsonPath)
        const { baseColumn, arrayLayers, finalProp } = parsed
        if (arrayLayers.length === 0) {
          // 无数组，普通 JSON 字段
          return finalProp
            ? `json_extract(${baseColumn}, '$.${finalProp}') AS "${name}"`
            : `${baseColumn} AS "${field}"`
        }

        // 有数组，生成 JOIN 语句和提取表达式
        const { joins: fieldJoins, extractExpr } = this.generateArrayJoins(parsed)
        fieldsJoins.push(...fieldJoins)
        return `${extractExpr} AS "${name}"`
      }
      return field.name // 普通字段
    })
    this.updateJoins(fieldsJoins)
    return fields
  }

  updateJoins(joins) {
    this.joins.push(...joins)
  }

  /**
   * 通用查询方法（支持多层 JSON 数组嵌套查询）
   * @param {string} table - 表名
   * @param {Array} fields - 查询字段（如 ['json:json.skcList[*].skuList[*].productName']）
   * @param {Object} where - 查询条件（如 { 'json:json.skcList[*].skuList[*].productName': '红色S码' }）
   * @param {Function} callback - 回调函数
   */
  generateSql() {
    const { table, selectModifier } = this
    let joins = this.joins // 所有 JOIN 语句
    // 处理查询字段
    const selectFields = this.formatFields().join(', ')

    // 处理 WHERE 条件
    const whereClauses = this.generateWhereClauses()

    // 去重 JOIN 语句（避免重复展开同一数组）
    const uniqueJoins = [...new Set(joins)]
    const joinSql = uniqueJoins.join(' ')
    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''
    const sql = this.handleSql({
      table,
      selectFields,
      joinSql,
      whereSql,
      selectModifier
    })
    console.log('生成的 SQL:', sql) // 调试用
    return sql
  }
}

const matchList = {
  all: (value) => {
    return value
  },
  prefix: (value) => {
    return `${value}%`
  },
  contains: (value) => {
    return `%${value}%`
  },
  suffix: (value) => {
    return `%${value}`
  }
}

function likeMatch(type, value) {
  return (matchList[type] || matchList.all)(value)
}

module.exports = {
  BuildSql,
  likeMatch
}
