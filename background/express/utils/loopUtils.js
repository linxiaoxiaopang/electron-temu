const { noop, merge } = require('lodash')
const { getUUID } = require('../../utils/random')
const { waitTimeByNum } = require('../../utils/sleep')

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
      retryCount = 3,
      beforeLoopCallback = async () => [false, null],
      requestCallback = noop
    }
  ) {
    this.req = req
    this.res = res
    this.retryCount = retryCount
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
    this.dateStamp = Date.now()
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

  clearCache(promise, response) {
    const { success, message } = response
    this.summary.isFinish = true
    this.summary.success = success
    this.summary.message = message
    let fIndex = this.actionPromiseList.findIndex(item => item === promise)
    this.actionPromiseList.splice(fIndex, 1)
    fIndex = this.instanceList.findIndex(item => item === this)
    this.instanceList.splice(fIndex, 1)
    //5分钟后清理数据
    setTimeout(() => {
      delete this.allSummary[this.uuid]
    }, 1000 * 60 * 5)
  }

  async abandonCacheInstanceRequest() {
    this.instanceList.map(item => {
      if (item == this) return
      item.abandon = true
    })
    await this.wait()
  }

  async loop() {
    const { summary } = this
    summary.dateStamp = Date.now()
    this.allSummary[this.uuid] = summary
    do {
      let [err, taskRes] = await this.requestCallback(summary)
      if (err && this.retryCount >= 0) {
        for (let i = 0; i < this.retryCount; i++) {
          await waitTimeByNum((i + 1) * 1000)
          ;[err, taskRes] = await this.requestCallback(summary)
          if (!err) break
        }
      }
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
      const { isFinish, success, message } = this.allSummary[requestUuid]
      if (isFinish && !success) return [true, message]
      return [false, this.allSummary[requestUuid]]
    }
    let resolveHandler = null
    await this.wait()
    const p = new Promise(resolve => {
      resolveHandler = resolve
    })
    this.actionPromiseList.push(p)
    p.then((success) => {
      this.clearCache(p, success)
    })
    try {
      const beforeLoopRes = await this.beforeLoopCallback(this)
      if (beforeLoopRes[0]) return beforeLoopRes
      await this.loop()
      return [false, this.allSummary[this.uuid]]
    } catch (err) {
      console.log('e', err)
      resolveHandler({
        success: false,
        message: err
      })
      return [true, err]
    } finally {
      resolveHandler({
        success: true
      })
    }
  }
}

module.exports = {
  allRequestCache,
  LoopRequest
}
