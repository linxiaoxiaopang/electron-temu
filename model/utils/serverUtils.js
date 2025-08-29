const { Op, Sequelize } = require('sequelize')
const { isArray, cloneDeep, mergeWith, isFunction } = require('lodash')

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
    console.log('obj', obj)
    // 将条件添加到目标对象（关键修复：直接用条件作为键）
    obj[Op.and] = condition
    return obj
  }
}

class CreateServer {
  constructor(model) {
    this.model = model
  }

  static formatWhere(query) {
    const o1 = cloneDeep(query)
    const o2 = cloneDeep(query)
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

  static formatPage(query) {
    const { page } = query
    if (!(page?.pageIndex && page?.pageSize)) return {}
    const { pageIndex, pageSize } = page
    const offset = (pageIndex - 1) * pageSize
    return {
      offset,
      limit: pageSize
    }
  }

  async add(os) {
    try {
      if (!isArray(os)) os = [os]
      const res = await this.model.bulkCreate(os)
      return [false, res]
    } catch (err) {
      return [true, err]
    }
  }

  async update(id, obj) {
    try {
      const ins = await this.model.findByPk(id)
      ins.set(obj)
      const res = await ins.save()
      return [false, res]
    } catch (err) {
      return [true, err]
    }
  }

  async batchUpdate(updates) {
    // const transaction = await this.model.transaction()
    try {
      // 遍历每条更新数据
      for (const item of updates) {
        const { id, ...updateFields } = item // 分离ID和更新字段

        // 执行单条更新
        const [updatedCount] = await this.model.update(
          updateFields, // 每条数据的更新内容不同
          {
            where: { id }, // 按ID定位
            // transaction // 绑定事务
          }
        )
        if (updatedCount === 0) {
          console.warn(`ID为${id}的记录不存在，跳过更新`)
        }
      }

      // 所有更新成功，提交事务
      // await transaction.commit()
      console.log(`批量更新完成，共处理${updates.length}条数据`)

      // 验证更新结果
      const res = await this.model.findAll({
        where: { id: updates.map(item => item.id) },
        raw: true
      })
      return [false, res]
    } catch (err) {
      // await transaction.rollback()
      return [true, err]
    }
  }

  async find(where) {
    try {
      const res = await this.model.findAll({
        ...CreateServer.formatWhere(where),
        ...CreateServer.formatPage(where),
        raw: true,
        // 打印生成的SQL，用于验证
        logging: sql => console.log('SQL:', sql)
      })
      return [false, res]
    } catch (err) {
      return [true, err]
    }
  }

  async delete(where) {
    try {
      const res = await this.model.destroy({
        ...CreateServer.formatWhere(where),
        // 打印生成的SQL，用于验证
        logging: sql => console.log('SQL:', sql)
      })
      return [false, res]
    } catch (err) {
      return [true, err]
    }
  }

  async clear() {
    try {
      const res = await this.model.destroy({
        where: {},
        truncate: true
      })
      return [false, res]
    } catch (err) {
      return [true, err]
    }
  }

  getAllMethods() {
    const names = Object.getOwnPropertyNames(CreateServer.prototype).filter(item => item !== 'constructor').filter(name => typeof CreateServer.prototype[name] === 'function')
    return names.reduce((acc, name) => {
      acc[name] = this[name].bind(this)
      return acc
    }, {})
  }
}

module.exports = { CreateServer }

