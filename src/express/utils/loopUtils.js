const { getIsMock } = require('@/express/const')
const { getUUID } = require('@/utils/randomUtils')
const { noop, merge } = require('lodash')

const allSummary = {}
const actionPromiseList = {}

class LoopRequest {
  constructor(
    {
      req,
      res,
      cacheKey,
      beforeLoopCallback = noop,
      requestCallback = noop
    }
  ) {
    this.req = req
    this.res = res
    this.summary = {
      totalTasks: 0,
      completedTasks: 0
    }
    this.cacheKey = cacheKey
    if (!actionPromiseList[cacheKey]) {
      actionPromiseList[cacheKey] = []
    }
    this.currentPromiseList = actionPromiseList[this.cacheKey]
    this.beforeLoopCallback = beforeLoopCallback
    this.requestCallback = requestCallback
    this.uuid = getUUID()
  }

  get body() {
    return this.req.body
  }

  mockResponse() {
    return {
      totalTasks: 0,
      completedTasks: 0
    }
  }

  async loop() {
    const { summary } = this
    allSummary[this.uuid] = summary
    do {
      const [err, taskRes] = await this.requestCallback(summary)
      if (err) throw taskRes
      const { totalTasks, tasks, ...restRes } = taskRes
      merge(summary, restRes)
      summary.totalTasks = totalTasks
      summary.completedTasks = summary.completedTasks + tasks
    } while (summary.totalTasks > summary.completedTasks)
  }

  async wait() {
    await Promise.all(this.currentPromiseList)
  }

  async action() {
    const { requestUuid } = this.body
    if (requestUuid) return [false, allSummary[requestUuid]]
    let resolveHandler = null
    await this.wait()
    const p = new Promise(resolve => {
      resolveHandler = resolve
    })
    this.currentPromiseList.push(p)
    p.then(() => {
      const fIndex = this.currentPromiseList.findIndex(item => item === p)
      this.currentPromiseList.splice(fIndex, 1)
    })
    try {
      if (getIsMock()) return [false, this.mockResponse]
      await this.beforeLoopCallback()
      await this.loop()
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
