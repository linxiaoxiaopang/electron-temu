const { getWholeUrl } = require('~store/user')
const { createProxyToGetTemuData, createProxyMiddleware } = require('~express/middleware/proxyMiddleware')
const { map, chunk } = require('lodash')
const { traverseActivity } = require('~express/controllers/batchReportingActivities/batchReportingActivities')
const { getUUID } = require('~utils/random')
const { MALL_SOLE } = require('~store/user')
const { accDiv } = require('~utils/calculate')


class GetSemiSearchForChainSupplierData {
  constructor(
    {
      req,
      query
    }
  ) {
    this.req = req
    this.query = query
  }

  async getSearchForSemiSupplier() {
    const { req, query } = this
    return await new GetSearchForSupplierByManagedType({ req }).getData(query)
  }

  async getInfoQuery(orderList) {
    const orderIds = map(orderList, 'priceOrderId')
    const { req } = this
    const relativeUrl = '/api/kiana/magnus/mms/price/bargain-no-bom/batch/info/query'
    const wholeUrl = getWholeUrl(relativeUrl)
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
          if (item.supplyPrice) {
            const unit = siteItem.supplierPrice.substr(0, 1)
            siteItem.supplierPriceValue = item.supplyPrice
            siteItem.supplierPrice = `${unit}${accDiv(item.supplyPrice, 100)}`
          }
        })
        skuItem.siteSupplierPriceList = [siteItem]
      }
    })
    return response
  }
}

class GetSearchForSupplierByManagedType {
  constructor(
    {
      req
    }
  ) {
    this.req = req
  }

  get managedType() {
    return this.req.customData.managedType
  }

  get option() {
    const list = {
      [MALL_SOLE.semiSole]: {
        relativeUrl: '/api/kiana/mms/robin/searchForSemiSupplier'
      },

      [MALL_SOLE.fullSole]: {
        relativeUrl: '/api/kiana/mms/robin/searchForChainSupplier'
      }
    }
    return list[this.managedType]
  }

  async getData(query) {
    const { req } = this
    const relativeUrl = this.option.relativeUrl
    const wholeUrl = getWholeUrl(relativeUrl)
    return await createProxyToGetTemuData(req)(wholeUrl, { data: query })
  }

  async getDataByProductSkuIdList(productSkuIdList) {
    const pageSize = 50
    const chunkData = chunk(productSkuIdList, pageSize)
    const allData = []
    const query = {
      pageSize,
      productSkuIdList: [],
      supplierTodoTypeList: [],
      pageNum: 1
    }
    for (let productSkuIdList of chunkData) {
      query.productSkuIdList = productSkuIdList
      const response = await this.getData(query)
      const dataList = response?.data?.dataList || []
      allData.push(...dataList)
    }
    return allData
  }
}

module.exports = {
  GetSemiSearchForChainSupplierData,
  GetFullSearchForChainSupplierData,
  GetSearchForSupplierByManagedType
}
