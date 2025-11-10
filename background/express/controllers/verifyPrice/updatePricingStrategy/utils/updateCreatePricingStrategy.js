const { ipcRendererInvokeAdd } = require('~express/utils/dbDataUtils')
const { createProxyToGetTemuData } = require('~express/middleware/proxyMiddleware')
const { GetSearchForSupplierByManagedType } = require('~express/controllers/verifyPrice/searchForChainSupplier/utils/getFullSearchForChainSupplierData')
const { customIpcRenderer } = require('~utils/event')
const { map, groupBy, cloneDeep, chunk } = require('lodash')
const { getWholeUrl } = require('~store/user')
const { throwPromiseError } = require('~utils/promise')
const { traverseActivity } = require('~express/controllers/batchReportingActivities/batchReportingActivities')

class UpdateSemiPricingStrategy {
  constructor(
    {
      req
    }
  ) {
    this.req = req
    this.strategyList = []
    this.relativeUrl = '/api/kiana/magnus/mms/price/bargain-no-bom/batch'
  }

  get body() {
    return this.req.body
  }

  async collectPricingStrategyHistory() {
    return await throwPromiseError(ipcRendererInvokeAdd('db:temu:pricingStrategyHistory:add', this.strategyList.map(item => {
          const { id, ...restItem } = item
          return restItem
        })
      )
    )
  }

  async collectPricingStrategy() {
    return await throwPromiseError(ipcRendererInvokeAdd('db:temu:pricingStrategy:add', this.strategyList))
  }

  async getPricingStrategy() {
    return await throwPromiseError(customIpcRenderer.invoke('db:temu:pricingStrategy:find', {
        where: {
          skuId: {
            ['op:in']: map(this.strategyList, 'skuId')
          }
        }
      })
    )
  }

  async deletePricingStrategy() {
    const pricingStrategy = await this.getPricingStrategy()
    return await throwPromiseError(customIpcRenderer.invoke('db:temu:pricingStrategy:delete', {
        where: {
          id: {
            ['op:in']: map(pricingStrategy, 'id')
          }
        }
      })
    )
  }

  strategyListCalculateCost(strategyList) {
    strategyList = cloneDeep(strategyList)
    return strategyList.map(item => {
      item.calculateCost = calcItemCalculateCost(item)
      return item
    })

    function calcItemCalculateCost(item) {
      const { max, ceil } = Math
      let { isClose, minCost, maxCost, priceFixed, pricePercentage, alreadyPricingNumber, suggestSupplyPrice } = item
      let calculateCost = maxCost
      if (isClose) return maxCost
      if (priceFixed) {
        calculateCost = ceil(maxCost - priceFixed * alreadyPricingNumber)
      } else {
        calculateCost = ceil(maxCost - pricePercentage / 100 * maxCost)
      }
      if (suggestSupplyPrice && calculateCost < +suggestSupplyPrice) {
        calculateCost = suggestSupplyPrice
      }
      return max(calculateCost, minCost)
    }
  }

  getParams() {
    const groupData = groupBy(this.strategyList, 'priceOrderId')
    const itemRequests = []
    Object.keys(groupData).map(key => {
      const values = groupData[key]
      const priceOrderId = key
      itemRequests.push({
        priceOrderId,
        items: values.map(item => {
          const { skuId: productSkuId, calculateCost: price } = item
          return {
            productSkuId,
            price
          }
        })
      })
    })
    return itemRequests
  }

  updateBody(params) {
    this.body.itemRequests = params
    delete this.body.strategyList
  }

  async summit() {
    return await createProxyToGetTemuData(this.req)(getWholeUrl(this.relativeUrl))
  }


  async getLatestPricingStrategy(successStrategyList) {
    return await throwPromiseError(customIpcRenderer.invoke('db:temu:latestPricingStrategy:find', {
      where: {
        skuId: {
          ['op:in']: map(successStrategyList, 'skuId')
        }
      }
    }))
  }

  async updateLatestPricingStrategy(response) {
    const successStrategyList = getSuccessStrategyList.call(this, response)
    const res = await this.getLatestPricingStrategy()
    const temArr = [...res]
    const temArr1 = []
    successStrategyList.map(item => {
      const fItem = res.find(sItem => sItem.skuId == item.skuId)
      if (fItem) {
        item.registerCount = fItem.registerCount + 1
        return
      }
      item.registerCount = 1
      temArr1.push(item)
    })
    await throwPromiseError(customIpcRenderer.invoke('db:temu:latestPricingStrategy:add', temArr))
    await throwPromiseError(customIpcRenderer.invoke('db:temu:latestPricingStrategy:add', temArr1))

    function getSuccessStrategyList(response) {
      const needUpdateResult = []
      const batchOperateResult = response?.data?.batchOperateResult
      const keys = Object.keys(batchOperateResult || {})
      keys.map(key => {
        const item = batchOperateResult[key]
        if (!item.success) return
        const needUpdateItems = this.strategyList.filter(sItem => sItem.priceOrderId === item.priceOrderId)
        needUpdateResult.push(...needUpdateItems)
      })
      return needUpdateResult
    }
  }

  async handleResponse(response) {
    return response
  }

  async action() {
    try {
      this.strategyList = this.strategyListCalculateCost(this.body?.strategyList || [])
      await this.collectPricingStrategyHistory()
      await this.deletePricingStrategy()
      await this.collectPricingStrategy()
      this.updateBody(this.getParams())
      let response = await this.summit()
      response = await this.handleResponse(response)
      await this.updateLatestPricingStrategy(response)
      return [false, response?.data]
    } catch (err) {
      return [true, err]
    }
  }
}

class UpdateFullPricingStrategy extends UpdateSemiPricingStrategy {
  constructor(option) {
    super(option)
    this.relativeUrl = '/api/kiana/mms/gmp/bg/magneto/api/price/re-price-review/click'
  }

  updateBody(params) {
    this.body.items = params
    delete this.body.strategyList
  }

  async handleResponse(response) {
    const instance = new GetSearchForSupplierByManagedType({
      req: this.req
    })
    response = {
      result: {
        batchOperateResult: {}
      },
      success: true
    }
    response.data = response.result
    const batchOperateResult = response.result.batchOperateResult
    const data = await instance.getDataByProductSkuIdList(map(this.strategyList, 'skuId'))
    traverseActivity({
      data,
      skuCallback: (skuItem, skcItem) => {
        const fItem = this.strategyList.find(sItem => sItem.skuId == skuItem.skuId)
        if (!fItem) return
        const supplierPriceReviewInfoList = skcItem?.supplierPriceReviewInfoList || []
        const success = supplierPriceReviewInfoList.some(item => item.status != 1)
        batchOperateResult[fItem.priceOrderId] = {
          success,
          priceOrderId: fItem.priceOrderId
        }
      }
    })
    return response
  }
}

module.exports = {
  UpdateSemiPricingStrategy,
  UpdateFullPricingStrategy
}
