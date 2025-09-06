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
      beforeLoopCallback = async () => [false, null],
      requestCallback = noop
    }
  ) {
    this.req = req
    this.res = res
    this.uuid = getUUID()
    this.summary = {
      totalTasks: 0,
      completedTasks: 0,
      requestUuid: this.uuid
    }
    this.cacheKey = cacheKey
    if (!actionPromiseList[cacheKey]) {
      actionPromiseList[cacheKey] = []
    }
    this.currentPromiseList = actionPromiseList[this.cacheKey]
    this.beforeLoopCallback = beforeLoopCallback
    this.requestCallback = requestCallback
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
      const beforeLoopRes = await this.beforeLoopCallback(this)
      if (beforeLoopRes[0]) return beforeLoopRes
      await this.loop()
      return [false, allSummary[this.uuid]]
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
