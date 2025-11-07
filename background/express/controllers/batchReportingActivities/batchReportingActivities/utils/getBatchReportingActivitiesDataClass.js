const { getData } = require('~express/utils/apiUtils')
const { map, merge, isArray, max } = require('lodash')
const { flatMapDeepByArray } = require('~utils/array')
const { getUUID } = require('~utils/random')
let traverseActivity = null
setTimeout(() => {
  traverseActivity = require('~express/controllers/batchReportingActivities/batchReportingActivities').traverseActivity
})

class GetSemiBatchReportingActivitiesDataClass {
  constructor(
    {
      req,
      query
    }
  ) {
    this.req = req
    this.query = query
    this.matchList = []
  }

  get productIds() {
    return map(this.matchList, 'productId')
  }

  async getEnrollScrollMatch() {
    const { req, query } = this
    const response = await getData({
      relativeUrl: '/api/kiana/gamblers/marketing/enroll/scroll/match',
      req,
      query
    })
    return response
  }

  async getSessionList() {
    const { req, productIds } = this
    const response = await getData({
      relativeUrl: '/api/kiana/gamblers/marketing/enroll/session/list',
      req,
      query: {
        productIds
      }
    })
    return response?.data
  }

  getListWarehouse() {}

  mergeListWarehouse() {}

  async getSearchForSemiSupplier() {
    const { req, productIds } = this
    const response = await getData({
      relativeUrl: '/api/kiana/mms/robin/searchForSemiSupplier',
      req,
      query: {
        pageNum: 1,
        pageSize: productIds.length,
        productSpuIdList: productIds,
        supplierTodoTypeList: []
      }
    })
    return response?.data
  }

  mergeEnrollSessionList(sessionListData) {
    const productCanEnrollSessionMap = sessionListData?.productCanEnrollSessionMap || {}
    this.matchList.map(item => {
      item.enrollSessionList = productCanEnrollSessionMap[item.productId] || []
    })
  }

  mergeSearchForSemiSupplier(searchForSemiSupplierData) {
    const { matchList } = this
    const dataList = searchForSemiSupplierData?.dataList || []
    dataList.map(item => {
      const flatSkcList = flatMapDeepByArray(item, ['skcList'])
      const fItem = matchList.find(sItem => item.productId == sItem.productId)
      if (!fItem) return
      traverseActivity({
        data: [fItem],
        productCallback(productItem) {
          const fItem = item
          const { catIdList, fullCategoryName, leafCategoryId, leafCategoryName } = fItem
          merge(productItem, {
            catIdList,
            fullCategoryName,
            leafCategoryId,
            leafCategoryName
          })
        },
        skcCallback(skcItem) {
          const fItem = flatSkcList.find(item => item.skcId == skcItem.skcId)
          if (!fItem) return
          const { statusTime } = fItem
          merge(skcItem, {
            statusTime
          })
        }
      })
    })
  }

  async action() {
    const response = await this.getEnrollScrollMatch()
    this.matchList = response?.data?.matchList || []
    const [sessionListData, searchForSemiSupplierData, listWarehouseData] = await Promise.all([this.getSessionList(), this.getSearchForSemiSupplier(), this.getListWarehouse()])
    this.mergeEnrollSessionList(sessionListData)
    this.mergeListWarehouse(listWarehouseData)
    this.mergeSearchForSemiSupplier(searchForSemiSupplierData)
    return response
  }
}

class GetFullBatchReportingActivitiesDataClass extends GetSemiBatchReportingActivitiesDataClass {
  constructor(option) {
    super(option)
  }

  getSessionList() {
    return this.matchList.reduce((prev, cur) => {
        prev.productCanEnrollSessionMap[cur.productId] = [{
          siteId: getUUID(),
          siteName: null
        }]
        return prev
      },
      {
        productCanEnrollSessionMap: {}
      }
    )
  }

  async getListWarehouse() {
    const { req, productIds } = this
    const response = await getData({
      relativeUrl: '/mms/venom/api/supplier/sales/management/listWarehouse',
      req,
      query: {
        isLack: 0,
        priceAdjustRecentDays: 7,
        pageNo: 1,
        pageSize: productIds.length,
        productIdList: productIds
      }
    })
    return response?.data
  }

  mergeListWarehouse(listWarehouseData) {
    const { matchList } = this
    const flatData = flatMapDeepByArray(listWarehouseData, ['subOrderList', 'skuQuantityDetailList'])
    traverseActivity({
      data: matchList,
      skuCallback(skuItem) {
        const skuId = skuItem.skuId
        const fItem = flatData.find(item => item.productSkuId == skuId)
        if (!fItem) return
        skuItem.warehouseInventoryNum = max(map(fItem.warehouseInfoList, 'inventoryNumInfo.warehouseInventoryNum'))
      }
    })
  }

  mergeSearchForSemiSupplier(searchForSemiSupplierData) {
    const { matchList } = this
    traverseActivity({
      data: matchList,
      skuCallback(skuItem, skcItem, productItem) {
        const sitePriceList = skuItem.sitePriceList
        if (isArray(sitePriceList)) return
        const enrollSessionItem = productItem?.enrollSessionList?.[0]
        skuItem.sitePriceList = [
          {
            dailyPrice: skuItem.dailyPrice,
            siteId: enrollSessionItem?.siteId,
            siteName: enrollSessionItem?.siteName,
            suggestActivityPrice: skuItem.suggestActivityPrice
          }
        ]
      }
    })
    super.mergeSearchForSemiSupplier(searchForSemiSupplierData)
  }
}

module.exports = {
  GetSemiBatchReportingActivitiesDataClass,
  GetFullBatchReportingActivitiesDataClass
}
