const { emitter } = require('../../utils/event')
const { getMallIds, getBaseUrl } = require('~store/user')
const axios = require('axios')
const { customIpcRenderer } = require('~utils/event')

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

  async syncByMall(mallId) {
    const baseUrl = await getBaseUrl()
    const wWholeUrl = `${baseUrl}/temu-agentseller/api/automation/process/sync`
    const { purchaseTimeFrom, purchaseTimeTo } = this.timerRecord
    const response = await axios({
      method: 'post',
      url: wWholeUrl,
      data: {
        mallId,
        purchaseTimeFrom,
        purchaseTimeTo
      }
    })
    return response?.data?.data
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
      return await this.syncByMall(mallId)
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
