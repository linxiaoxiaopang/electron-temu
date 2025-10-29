const baseWare = require('ware')
const { findLastIndex } = require('lodash')

class Ware extends baseWare {
  constructor() {
    super()
  }

  globalError(...args) {
    console.log('存在错误信息未捕获args', args)
  }

  noCatchError(fn) {
    const lastErrMidIndex = findLastIndex(this.fns, item => item.fn.length == 3)
    const fIndex = this.fns.findIndex(item => item.fn == fn)
    return lastErrMidIndex <= fIndex
  }

  handlerInvoke() {
    const [fn, ...args] = arguments
    const next = args[args.length - 1]
    try {
      const ret = fn.apply(this, args)
      if (ret instanceof Promise) {
        ret.catch(err => {
          this.error = err
          next()
          return err
        })
      }
      return ret
    } catch (err) {
      this.error = err
      if (this.noCatchError(fn)) {
        if (args.length >= 3) {
          args.shift()
          args.unshift(err)
        }
        this.globalError(...args)
      }
      next()
    }
  }

  middlewareWrapper(fn) {
    const invoke = function (ctx, next) {
      if (this.error) return next()
      return this.handlerInvoke(fn, ctx, next)
    }
    invoke.fn = fn
    return invoke
  }

  errorMiddlewareWrapper(fn) {
    const invoke = function (ctx, next) {
      if (!this.error) return next()
      const err = this.error
      this.error = null
      return this.handlerInvoke(fn, err, ...arguments)
    }
    invoke.fn = fn
    return invoke
  }

  fnWrapper(fn) {
    switch (fn.length) {
      case 2:
        return this.middlewareWrapper(fn)
      case 3:
        return this.errorMiddlewareWrapper(fn)
      default:
        throw new Error('中间件函数参数个数只能是 2 或 3')
    }
  }

  use(fn) {
    if (fn instanceof Ware) {
      return this.use(fn.fns)
    }

    if (fn instanceof Array) {
      for (let i = 0, f; f = fn[i++];) this.use(f)
      return this
    }
    const invoke = this.fnWrapper(fn)
    if (!invoke) return
    this.fns.push(invoke)
    return this
  }

  run(ctx) {
    this.error = null
    return super.run(ctx)
  }
}


class ServerWare extends Ware {
  constructor() {
    super()
  }

  async run(ctx) {
    let resolveHandler = null
    const p = new Promise(resolve => {
      resolveHandler = resolve
    })
    if (!ctx?.res) {
      ctx.res = {}
    }
    if (!ctx.res?.send) {
      ctx.res.send = function (data) {
        resolveHandler(data)
      }
    }
    super.run(ctx)
    return await p
  }
}

module.exports = {
  Ware,
  ServerWare
}
