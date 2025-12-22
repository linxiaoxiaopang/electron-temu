const {
  isString,
  isFunction,
  cloneDeep,
  isUndefined,
  groupBy,
  isArray,
  isPlainObject,
  isNaN,
  isNull
} = require('lodash')


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

  get group() {
    return this.option?.group || []
  }

  get fields() {
    return this.option?.fields || [{
      prop: `${this.table}.*`,
      name: `${this.table}.*`
    }]
  }

  get query() {
    return this.option?.query
  }

  get selectModifier() {
    return this.option?.selectModifier || ''
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

  formatFiledValue(value) {
    if (isUndefined(value) || isNaN(value)) return undefined
    return value
  }

  handleOption(option) {
    let { query, column, group } = option
    if (!group) group = option.group = []
    if (column) {
      group.push({
        column
      })
    }
    group.map(item => {
      item.column.map(sItem => {
        let { queryProp, prop } = sItem
        queryProp = queryProp || prop
        sItem.logical = sItem.logical || 'AND'
        if (isFunction(sItem.value)) {
          sItem.value = sItem.value(queryProp, query, this)
          return
        }
        if (!queryProp || !query || !isUndefined(sItem.value)) return
        sItem.value = isUndefined(query[queryProp]) ? sItem.value : query[queryProp]
      })
      item.column.map(item => {
        item.value = this.formatFiledValue(item.value)
        if (!item.valueFormatter) {
          item.valueFormatter = (value) => value
        }
      })
      item.column = item.column.filter(item => !isUndefined(item.value))
      item.logical = item.logical || 'AND'
      item.part = item.part || 'default'
    })
    option.group = group.filter(item => item.column.length)
    if (isArray(option.fields)) {
      option.fields = option.fields.map(item => {
        if (isPlainObject(item)) {
          if (!item.prop) throw `column ${item.prop} is not exist`
          if (!item.name) item.name = item.prop
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

    this.updateJoins(joins)

    return { joins, extractExpr, lastAlias: currentAlias }
  }

  escapeValue(value) {
    if (isArray(value)) return value.map(item => this.escapeValue(item))
    if (isNull(value)) return 'Null'
    if (isString(value)) return `'${value.replace(/'/g, "''")}'`
    return value
  }

  conversionToMemberType(value, memberType) {
    if (!memberType) return value
    if (isArray(value)) return value.map(item => this.conversionToMemberType(item, memberType))
    switch (memberType) {
      case 'number':
        return Number(value)
      case 'boolean':
        return Boolean(value)
      case 'string':
        return String(value)
      default:
        return value
    }
  }

  generateWhereClause(col) {
    // 处理 WHERE 条件
    const { prop: key, value, valueFormatter, memberType } = col
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
    let processedValue = this.conversionToMemberType(value, memberType)

    if (this.isJsonField(processedValue)) {
      processedValue = this.analysisJsonField(processedValue)
    } else if (isString(processedValue)) {
      processedValue = this.escapeValue(processedValue) // 转义单引号
    }
    if (/^(not\s+)?in$/ig.test(operator)) {
      processedValue = `(${this.escapeValue(processedValue)})`
    }
    processedValue = valueFormatter(processedValue, this)
    let whereClaus = ''
    if (this.isJsonField(field)) {
      const expr = this.analysisJsonField(field)
      whereClaus = `${expr} ${operator} ${processedValue}`
      // whereClauses.push(`${expr} ${operator} ${processedValue}`)
    } else {
      // 普通字段条件
      whereClaus = `${field} ${operator} ${processedValue}`
      // whereClauses.push(`${field} ${operator} ${processedValue}`)
    }
    return whereClaus
  }

  isJsonField(field) {
    if (!isString(field)) return false
    return field.startsWith(this.mask.json)
  }

  analysisJsonField(field) {
    if (!this.isJsonField(field)) return ''
    const jsonPath = field.slice(5)
    const parsed = this.parseMultiArrayPath(jsonPath) // 复用之前的路径解析函数
    const { arrayLayers, baseColumn, finalProp } = parsed
    if (arrayLayers.length === 0) {
      return finalProp
        ? `json_extract(${baseColumn}, '$.${finalProp}')`
        : baseColumn
    }
    return this.generateArrayJoins(parsed).extractExpr
  }

  formatFields() {
    let fields = this.fields
    fields = fields.map(field => {
      const { prop, name, valueFormatter } = field
      if (this.isJsonField(prop)) {
        let expr = this.analysisJsonField(prop)
        if (valueFormatter) {
          expr = valueFormatter(expr, field, this)
        }
        return `${expr} AS "${name}"`
      }
      return field.name // 普通字段
    })
    return fields
  }

  updateJoins(joins) {
    this.joins.push(...joins)
  }

  generateWhereSql() {
    let whereSql = '1'
    const group = this.group
    // 处理 WHERE 条件
    group.map(item => {
      let itemWhereClause = ''
      const groupData = groupBy(item.column, 'part')
      let isStart = true
      for (let key in groupData) {
        let sItemWhereClause = ''
        groupData[key].map((sItem, sIndex) => {
          const whereClaus = this.generateWhereClause(sItem)
          const logical = isStart ? '' : sItem.logical
          isStart = false
          if (logical) {
            if (sIndex == 0) {
              itemWhereClause += ` ${logical} `
            } else {
              sItemWhereClause += ` ${logical} `
            }
          }
          sItemWhereClause += whereClaus
        })
        if (sItemWhereClause) itemWhereClause += `(${sItemWhereClause})`
      }
      if (itemWhereClause) itemWhereClause = `(${itemWhereClause})`
      whereSql += ` ${item.logical} ${itemWhereClause}`
    })
    if (whereSql) whereSql = `WHERE ${whereSql}`
    return whereSql
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
    const whereSql = this.generateWhereSql()
    // 去重 JOIN 语句（避免重复展开同一数组）
    const uniqueJoins = [...new Set(joins)]
    const joinSql = uniqueJoins.join(' ')
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
