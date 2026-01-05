const { emitter } = require('../../utils/event')
const { getMallIds, getBaseUrl } = require('~store/user')
const axios = require('axios')

class BatchSyncAutomationProcess {
  constructor(
    {
      timerRecord,
      mallIds = []
    }
  ) {
    this.timerRecord = timerRecord
    this.mallIds = mallIds
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

  async syncAllMall() {
    const pArr = this.mallIds.map(async (mallId) => {
      return await this.syncByMall(mallId)
    })
    return await Promise.all(pArr)
  }

  async action() {
    try {
      return await this.syncAllMall()
    } catch (err) {
      console.log('err', err)
    } finally {
      emitter.emit('automationConfig:timer:update:done')
    }
  }
}

emitter.on('automationConfig:timer:update', async (timerRecord) => {
  const { mallIds } = timerRecord
  const collectMallIds = getMallIds()
  const filterMallIds = collectMallIds.filter(item => mallIds.find(mallId => mallId == item))
  const instance = new BatchSyncAutomationProcess({
    timerRecord,
    mallIds: filterMallIds
  })
  await instance.action()
})
