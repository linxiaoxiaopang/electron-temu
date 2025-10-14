const { noop, merge } = require('lodash')
const { getUUID } = require('../../utils/random')

// allSummary: {},
// actionPromiseList: {},
// instanceList: {}

const allRequestCache = {}

class LoopRequest {
  constructor(
    {
      req,
      res,
      cacheKey,
      beforeLoopCallback = async () => [false, null],
      requestCallback = noop
    }
  ) {
    this.req = req
    this.res = res
    this.uuid = getUUID()
    this.abandon = false
    this.summary = {
      totalTasks: 0,
      completedTasks: 0,
      requestUuid: this.uuid
    }
    this.cacheKey = cacheKey
    this.cache = this.initCache()
    this.instanceList.push(this)
    this.beforeLoopCallback = beforeLoopCallback
    this.requestCallback = requestCallback
  }

  get body() {
    return this.req.body
  }

  get actionPromiseList() {
    return this.cache.actionPromiseList
  }

  get allSummary() {
    return this.cache.allSummary
  }

  get instanceList() {
    return this.cache.instanceList
  }

  initCache() {
    const cacheKey = this.cacheKey
    if (!allRequestCache[cacheKey]) {
      allRequestCache[cacheKey] = {
        allSummary: [],
        actionPromiseList: [],
        instanceList: []
      }
    }
    return allRequestCache[cacheKey]
  }

  clearCache(promise) {
    delete this.allSummary[this.uuid]
    let fIndex = this.actionPromiseList.findIndex(item => item === promise)
    this.actionPromiseList.splice(fIndex, 1)
    fIndex = this.instanceList.findIndex(item => item === this)
    this.instanceList.splice(fIndex, 1)
  }

  async abandonCacheInstanceRequest() {
    this.instanceList.map(item => {
      if(item == this) return
      item.abandon = true
    })
    await this.wait()
  }

  async loop() {
    const { summary } = this
    this.allSummary[this.uuid] = summary
    do {
      const [err, taskRes] = await this.requestCallback(summary)
      if (err) throw taskRes
      if (this.abandon) throw '新任务进入，旧任务中断。'
      const { totalTasks, tasks, ...restRes } = taskRes
      merge(summary, restRes)
      summary.totalTasks = totalTasks
      summary.completedTasks = summary.completedTasks + tasks
    } while (summary.totalTasks > summary.completedTasks)
  }

  async wait() {
   return await Promise.all(this.actionPromiseList)
  }

  async action() {
    const { requestUuid } = this.body
    if (requestUuid) {
      if (!this.allSummary[requestUuid]) return [true, '请求已取消']
      return [false, this.allSummary[requestUuid]]
    }
    let resolveHandler = null
    await this.wait()
    const p = new Promise(resolve => {
      resolveHandler = resolve
    })
    this.actionPromiseList.push(p)
    p.then(() => {
      this.clearCache(p)
    })
    try {
      const beforeLoopRes = await this.beforeLoopCallback(this)
      if (beforeLoopRes[0]) return beforeLoopRes
      await this.loop()
      return [false, this.allSummary[this.uuid]]
    } catch (e) {
      console.log('e', e)
      return [true, e]
    } finally {
      resolveHandler()
    }
  }
}

module.exports = {
  LoopRequest
}
