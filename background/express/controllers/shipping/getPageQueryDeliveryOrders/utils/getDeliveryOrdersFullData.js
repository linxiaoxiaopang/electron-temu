const { getWholeUrl, kuangjingmaihuo } = require('~store/user')
const { createProxyToGetTemuData } = require('~express/middleware/proxyMiddleware')
const LimitQueue = require('~utils/limitQueue')

class GetDeliveryOrdersFullData {
  constructor(
    {
      req
    }
  ) {
    this.req = req
    this.retryCount = 0
    this.maxRetryCount = 6
    this.count = 0
    this.maxLimit = 10
    this.deliveryOrdersData = []
  }

  get lackDeliveryOrdersData() {
    return this.deliveryOrdersData.filter(item => !item._getReedbackRecordInfo)
  }

  async getDeliveryOrdersData() {
    const { req } = this
    const relativeUrl = '/bgSongbird-api/supplier/deliverGoods/management/pageQueryDeliveryOrders'
    const wholeUrl = getWholeUrl(relativeUrl, kuangjingmaihuo)
    return await createProxyToGetTemuData(req)(wholeUrl)
  }

  async getFeedbackRecordInfo(row) {
    const { req } = this
    const query = {
      deliveryBatchSn: row.expressBatchSn,
      expressCompanyId: row.expressCompanyId,
      expressDeliverySn: row.expressDeliverySn
    }
    const relativeUrl = '/bgSongbird-api/supplier/delivery/feedback/queryAllFeedbackRecordInfo'
    const wholeUrl = getWholeUrl(relativeUrl, kuangjingmaihuo)
    return await createProxyToGetTemuData(req)(wholeUrl, { data: query })
  }


  createFeedbackRecordInfoFn(item, resolve) {
    return async () => {
      this.count++
      const res = await this.getFeedbackRecordInfo(item)
      item.reedbackRecordInfo = res.data
      item._getReedbackRecordInfo = true
      if (!res?.data?.success && res?.data.errorCode == 4000004) item._getReedbackRecordInfo = false
      resolve(res)
    }
  }

  markDeliveryOrdersData(data) {
    data.map(item => {
      item._getReedbackRecordInfo = false
      return item
    })
    return () => {
      return data.map(item => {
        delete item._getReedbackRecordInfo
      })
    }
  }

  async loopGetAllFeedbackRecordInfo() {
    const { max } = Math
    const { lackDeliveryOrdersData } = this
    if (!lackDeliveryOrdersData.length) return
    const limitInstance = new LimitQueue({
      limit: max(this.maxLimit - this.retryCount * 2, 1)
    })
    const pArr = lackDeliveryOrdersData.map(item => {
      return new Promise(resolve => {
        const fn = this.createFeedbackRecordInfoFn(item, resolve)
        limitInstance.concat(fn)
      })
    })
    await Promise.all(pArr)
    if (++this.retryCount < this.maxRetryCount) {
      await this.loopGetAllFeedbackRecordInfo()
    }
  }

  async action() {
    const response = await this.getDeliveryOrdersData()
    this.deliveryOrdersData = response?.data?.list || []
    const clearMark = this.markDeliveryOrdersData(this.deliveryOrdersData)
    await this.loopGetAllFeedbackRecordInfo()
    console.log('this.count', this.count)
    clearMark()
    return response
  }
}

module.exports = {
  GetDeliveryOrdersFullData
}
