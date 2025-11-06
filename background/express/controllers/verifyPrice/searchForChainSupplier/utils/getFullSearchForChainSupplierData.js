const { getTemuTarget } = require('~store/user')
const { createProxyToGetTemuData } = require('~express/middleware/proxyMiddleware')
const { map } = require('lodash')
const { traverseActivity } = require('~express/controllers/batchReportingActivities/batchReportingActivities')
const { getUUID } = require('~utils/random')


class GetSemiSearchForChainSupplierData {
  constructor(
    {
      req,
      query
    }
  ) {
    this.req = req
    this.query = query
    this.searchForSemiSupplierRelativeUrl = '/api/kiana/mms/robin/searchForSemiSupplier'
  }

  async getSearchForSemiSupplier() {
    const { query, req } = this
    const relativeUrl = this.searchForSemiSupplierRelativeUrl
    const wholeUrl = `${getTemuTarget()}${relativeUrl}`
    return await createProxyToGetTemuData(req)(wholeUrl, { data: query })
  }

  async getInfoQuery(orderList) {
    const orderIds = map(orderList, 'priceOrderId')
    const { req } = this
    const relativeUrl = '/api/kiana/magnus/mms/price/bargain-no-bom/batch/info/query'
    const wholeUrl = `${getTemuTarget()}${relativeUrl}`
    const response = await createProxyToGetTemuData(req)(wholeUrl, {
      data: {
        orderIds
      }
    })
    return response?.data
  }

  getOrderList(dataList) {
    const orderList = []
    traverseActivity({
      data: dataList,
      skcCallback(skcItem) {
        const supplierPriceReviewInfoList = skcItem.supplierPriceReviewInfoList || []
        orderList.push(...supplierPriceReviewInfoList)
      }
    })
    return orderList
  }

  async handleResponse(response) {
    const dataList = response?.data?.dataList || []
    const orderList = this.getOrderList(dataList)
    const infoQueryData = await this.getInfoQuery(orderList)
    const priceReviewItemList = infoQueryData?.priceReviewItemList || []
    const skuInfoList = priceReviewItemList.reduce((prev, cur) => {
      prev.push(...cur.skuInfoList)
      return prev
    }, [])
    traverseActivity({
      data: dataList,
      skuCallback(skuItem) {
        const fItem = skuInfoList.find(item => item.productSkuId == skuItem.skuId)
        if (!fItem) return
        skuItem.siteSupplierPriceList?.map(item => {
          item.suggestSupplyPrice = fItem.suggestSupplyPrice
        })
      }
    })
  }

  async action() {
    const response = await this.getSearchForSemiSupplier()
    await this.handleResponse(response)
    return response
  }
}

class GetFullSearchForChainSupplierData extends GetSemiSearchForChainSupplierData {
  constructor(option) {
    super(option)
    this.searchForSemiSupplierRelativeUrl = '/api/kiana/mms/robin/searchForChainSupplier'
  }

  handleResponse(response) {
    const dataList = response?.data?.dataList || []
    traverseActivity({
      data: dataList,
      skuCallback(skuItem, skcItem) {
        const supplierPriceReviewInfoList = skcItem.supplierPriceReviewInfoList || []
        const siteItem = {
          siteId: getUUID(),
          siteName: null,
          supplierPriceValue: skuItem.supplierPriceValue,
          supplierPrice: skuItem.supplierPrice,
          supplierPriceCurrencyType: skuItem.supplierPriceCurrencyType,
          suggestSupplyPrice: null
        }
        supplierPriceReviewInfoList.map(item => {
          const fItem = item.productSkuList.find(sItem => sItem.skuId == skuItem.skuId)
          if (!fItem) return
          siteItem.suggestSupplyPrice = item.suggestSupplyPrice
        })
        skuItem.siteSupplierPriceList = [siteItem]
      }
    })
    return response
  }
}

module.exports = {
  GetSemiSearchForChainSupplierData,
  GetFullSearchForChainSupplierData
}
