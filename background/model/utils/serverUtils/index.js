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
    this.isSync = false
    this.emitter.createEventName = function (prop, value) {
      return `${prop}:${value}`
    }
  }

  async add(os, returnData = true) {
    const chain = new ServerWare()
    chain
      .use(async (ctx, next) => {
        const { res } = ctx
        if (!isArray(os)) os = [os]
        let data = await this.model.bulkCreate(os)
        if(isArray(data) && !returnData) data = data.length
        res.data = data
        next()
      })
      .use(resFormatter)
      .use(errFormatter)
    return await chain.run()
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
        const transaction = await sequelize.transaction()
        if (!isArray(updates)) updates = [updates]
        try {
          for (const item of updates) {
            const { id, ...restFields } = item // 分离ID和更新字段
            // 执行单条更新
            const [updatedCount] = await this.model.update(
              restFields, // 每条数据的更新内容不同
              {
                where: { id }, // 按ID定位
                transaction // 绑定事务
              }
            )
            if (updatedCount === 0) {
              throw `id:${id}数据更新失败，数据已经回滚。`
            }
          }
          // 所有更新成功，提交事务
          await transaction.commit()
        } catch (err) {
          await transaction.rollback()
          throw err
        }

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
    return await chain.run()
  }

  async find(req) {
    const chain = new ServerWare()
    chain
      .use(reqFormatter)
      .use(async (ctx, next) => {
        const { req, res } = ctx
        const { pageQuery, whereQuery } = req
        const data = await this.model.findAll({
          where: whereQuery,
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
          where: whereQuery,
          // 打印生成的SQL，用于验证
          logging: sql => console.log('SQL:', sql)
        })
        // if (!data) throw '未找到该数据'
        res.data = data
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

  validateIsSync() {
    return this.isSync
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

