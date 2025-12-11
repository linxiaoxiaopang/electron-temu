/* eslint-disable */
const { findIndex, map } = require('lodash')

class LimitQueue {
  promises = []

  constructor({ limit = 8, queues } = {}) {
    this.queues = queues || []
    this.setLimit(limit)
  }

  action = (queues) => {
    const promises = []
    this.concat(
      map(queues, (queue) => {
        let curResolve
        promises.push(new Promise(resolve => curResolve = resolve))
        return function (...args) {
          const p = queue.apply(this, args)
          curResolve(p)
          return p
        }
      })
    )
    return promiseAll(promises)
  }

  init() {
    const idle = this.limit - this.promises.length
    if (idle > 0) {
      this.queues.splice(0, idle).map(this.execute)
    }
  }

  execute = async (queue) => {
    if (typeof queue !== 'function') return this.init()
    if (this.promises.length >= this.limit) return this.queues.unshift(queue)

    const promise = queue()
    this.promises.push(promise)
    try {
      await promise
    } catch {
    }
    const index = findIndex(this.promises, promise)
    this.promises.splice(index, 1)

    this.limit > this.promises.length && this.execute(this.queues.shift())
  }

  add = (...queues) => {
    this.queues.push(...queues)
    this.init()
  }
  concat = (queues) => {
    this.queues = this.queues.concat(queues)
    this.init()
  }
  setLimit = (limit) => {
    this.limit = limit || 8
    this.init()
  }

  wrap = (fn) => {
    const { concat } = this
    return function (...args) {
      return new Promise(resolve => {
        concat(() => {
          const p = fn.apply(this, args)
          resolve(p)
          return p
        })
      })
    }
  }
}

function promiseAll(promises) {
  return new Promise((resolve) => {
    let res = []
    if (!Array.isArray(promises) || promises.length === 0) return resolve(res)
    let resLen = 0
    promises.map((promise, index) => {
      if (!(promise instanceof Promise)) {
        res[index] = promise
        if (++resLen === promises.length) resolve(res)
        return
      }
      return promise
        .then((data) => {
          res[index] = data
        })
        .catch(() => {
          res[index] = false
        })
        .finally(() => {
          if (++resLen === promises.length) resolve(res)
        })
    })
  })
}


module.exports = LimitQueue
