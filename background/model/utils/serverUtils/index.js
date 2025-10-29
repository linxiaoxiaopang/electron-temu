const EventEmitter = require('eventemitter3')
const { ServerWare } = require('~utils/ware')
const sequelize = require('~model/temu/db')
const reqFormatter = require('./middleWare/reqFormatter')
const resDataFormatter = require('./middleWare/resDataFormatter')
const pageFormatter = require('./middleWare/pageFormatter')
const resFormatter = require('./middleWare/resFormatter')
const errFormatter = require('./middleWare/errFormatter')
const { isArray, merge } = require('lodash')


class CreateServer {
  constructor(model) {
    this.model = model
    this.emitter = new EventEmitter()
    this.emitter.createEventName = function (prop, value) {
      return `${prop}:${value}`
    }
  }

  async add(os) {
    const chain = new ServerWare()
    chain
      .use(async (ctx, next) => {
        const { res } = ctx
        if (!isArray(os)) os = [os]
        const data = await this.model.bulkCreate(os)
        res.data = data
        next()
      })
      .use(resFormatter)
      .use(errFormatter)
    return await chain.run({
      req: {}
    })
  }

  async update(id, obj) {
    const chain = new ServerWare()
    chain
      .use(async (ctx, next) => {
        const { res } = ctx
        const ins = await this.model.findByPk(id)
        ins.set(obj)
        let data = await ins.save()
        data = data?.dataValues
        this.emitter.emit('update', data)
        res.data = data
        next()
      })
      .use(resFormatter)
      .use(errFormatter)
    return await chain.run({
      req: {}
    })
  }

  async batchUpdate(updates) {
    const chain = new ServerWare()
    chain
      .use(async (ctx, next) => {
        const { res } = ctx
        // const transaction = await this.model.transaction()
        if (!isArray(updates)) updates = [updates]
        for (const item of updates) {
          const { id, ...updateFields } = item // 分离ID和更新字段

          // 执行单条更新
          const [updatedCount] = await this.model.update(
            updateFields, // 每条数据的更新内容不同
            {
              where: { id } // 按ID定位
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
        const data = await this.model.findAll({
          where: { id: updates.map(item => item.id) },
          raw: true
        })
        res.data = data
        next()
      })
      .use(resFormatter)
      .use(errFormatter)
    return await chain.run({
      req: {}
    })
  }


  async find(req) {
    const chain = new ServerWare()
    chain
      .use(reqFormatter)
      .use(async (ctx, next) => {
        const { req, res } = ctx
        const { pageQuery, whereQuery } = req
        const data = await this.model.findAll({
          ...whereQuery,
          ...(pageQuery || {}),
          raw: true,
          // 打印生成的SQL，用于验证
          logging: sql => console.log('SQL:', sql)
        })
        res.data = data || []
        next()
      })
      .use(resDataFormatter)
      .use(pageFormatter)
      .use(resFormatter)
      .use(errFormatter)
    return await chain.run({
      req,
      server: this
    })
  }

  async delete(req) {
    const chain = new ServerWare()
    chain
      .use(reqFormatter)
      .use(async (ctx, next) => {
        const { req, res } = ctx
        const { whereQuery } = req
        const data = await this.model.destroy({
          ...whereQuery,
          // 打印生成的SQL，用于验证
          logging: sql => console.log('SQL:', sql)
        })
        res.data = data || []
        next()
      })
      .use(resFormatter)
      .use(errFormatter)
    return await chain.run({
      req,
      server: this
    })
  }

  async clear() {
    const chain = new ServerWare()
    chain
      .use(async (ctx, next) => {
        const { res } = ctx
        const data = await this.model.destroy({
          where: {},
          truncate: true
        })
        res.data = data || []
        next()
      })
      .use(resFormatter)
      .use(errFormatter)
  }

  async query(req) {
    const chain = new ServerWare()
    req.convertToCount = true
    chain
      .use(reqFormatter)
      .use(async (ctx, next) => {
        const { res, req } = ctx
        let { sql, pageQuery, replacements = {} } = req
        const finalReplacements = {}
        if (pageQuery) {
          sql = `${sql} LIMIT :offset, :limit`
          merge(finalReplacements, pageQuery)
        }
        merge(finalReplacements, replacements)
        const [data] = await sequelize.query(sql, {
          replacements: finalReplacements,
          logging: sql => console.log('SQL:', sql)
        })
        res.data = data || []
        next()
      })
      .use(resDataFormatter)
      .use(pageFormatter)
      .use(resFormatter)
      .use(errFormatter)
    return await chain.run({
      req,
      server: this
    })
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

