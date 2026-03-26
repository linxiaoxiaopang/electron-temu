const { emitter } = require('../../utils/event')
const { getMallIds } = require('~store/user')
const { customIpcRenderer } = require('~utils/event')
const { localRequest } = require('~express/utils/apiUtils')
const { throwPromiseError } = require('~utils/promise')
const { automationOrderTypeList } = require('~express/api/automation/const')

let runUid = 0

class BatchSyncAutomationProcess {
  constructor(
    {
      timerRecord,
      mallIds = [],
      runUid
    }
  ) {
    this.timerRecord = timerRecord
    this.mallIds = mallIds
    this.runUid = runUid
  }

  get selectedOrderTypeList() {
    return this.timerRecord.selectedOrderTypeList || []
  }

  async syncProcessByMall(mallId) {
    const relativeUrl = `/temu-agentseller/api/automation/process/sync`
    const { purchaseTimeFrom, purchaseTimeTo } = this.timerRecord
    const response = await throwPromiseError(localRequest(relativeUrl, {
      data: {
        mallId,
        purchaseTimeFrom,
        purchaseTimeTo
      }
    }))
    return response?.data
  }

  async syncProcessForImageByMall(mallId) {
    const relativeUrl = `/temu-agentseller/api/automation/process/syncForImage`
    const { labelCreateTimeFrom, labelCreateTimeTo } = this.timerRecord
    const response = await throwPromiseError(localRequest(relativeUrl, {
      data: {
        mallId,
        labelCreateTimeFrom,
        labelCreateTimeTo
      }
    }))
    return response?.data
  }

  async syncProcessForVirtualOrder(mallId) {
    const relativeUrl = `/temu-agentseller/api/automation/process/syncForVirtualOrder`
    const { labelCreateTimeFrom, labelCreateTimeTo } = this.timerRecord
    const response = await throwPromiseError(localRequest(relativeUrl, {
      data: {
        mallId,
        labelCreateTimeFrom,
        labelCreateTimeTo
      }
    }))
    return response?.data
  }

  async syncProcessForY2(mallId) {
    const relativeUrl = `/temu-agentseller/api/automation/process/syncForY2`
    const { purchaseTimeFrom, purchaseTimeTo } = this.timerRecord
    const response = await throwPromiseError(localRequest(relativeUrl, {
      data: {
        mallId,
        purchaseTimeFrom,
        purchaseTimeTo
      }
    }))
    return response?.data
  }

  async updateConfig(obj) {
    try {
      const [err, res] = await customIpcRenderer.invoke('db:temu:automationConfig:update', 1, obj)
      if (err) throw  res
      return res
    } catch (err) {
      return null
    }
  }

  async syncAllMall() {
    const pArr = this.mallIds.map(async (mallId) => {
      const { selectedOrderTypeList } = this
      let isFind = selectedOrderTypeList.find(orderType => orderType == automationOrderTypeList.normal)
      if (isFind) await this.syncProcessByMall(mallId)
      isFind = selectedOrderTypeList.find(orderType => orderType == automationOrderTypeList.image)
      if (isFind) await this.syncProcessForImageByMall(mallId)
      isFind = selectedOrderTypeList.find(orderType => orderType == automationOrderTypeList.virtual)
      if (isFind) await this.syncProcessForVirtualOrder(mallId)
      isFind = selectedOrderTypeList.find(orderType => orderType == automationOrderTypeList.y2)
      if (isFind) await this.syncProcessForY2(mallId)
      return true
    })
    return await Promise.all(pArr)
  }

  async action() {
    try {
      await this.updateConfig({ processing: true })
      return await this.syncAllMall()
    } catch (err) {
      console.log('err', err)
    } finally {
      if (this.runUid == runUid) {
        emitter.emit('automationConfig:timer:update:done')
      }
      await this.updateConfig({ processing: false })
    }
  }
}

emitter.on('automationConfig:timer:update', async (timerRecord) => {
  const { mallIds } = timerRecord
  const collectMallIds = getMallIds()
  const filterMallIds = collectMallIds.filter(item => mallIds.find(mallId => mallId == item))
  const instance = new BatchSyncAutomationProcess({
    timerRecord,
    mallIds: filterMallIds,
    runUid: ++runUid
  })
  await instance.action()
})
