const { map } = require('lodash')
const { getTemuTarget } = require('../../const')
const { createProxyToGetTemuData } = require('../../middleware/proxyMiddleware')

/**
 * SearchForChainSupplier 接口新增 priceReviewItem 项
 * @param req
 * @param query
 * @returns {Promise<*>}
 */
async function getFullSearchForChainSupplierData(
  {
    req,
    query
  }
) {
  const relativeUrl0 = '/api/kiana/mms/robin/searchForSemiSupplier'
  const relativeUrl1 = '/api/kiana/magnus/mms/price/bargain-no-bom/batch/info/query'
  const wholeUrl0 = `${getTemuTarget()}${relativeUrl0}`
  const wholeUrl1 = `${getTemuTarget()}${relativeUrl1}`
  const getData0 = createProxyToGetTemuData(req)
  const getData1 = createProxyToGetTemuData(req)
  const response0 = await getData0(wholeUrl0, { data: query })
  const dataList = response0?.data?.dataList || []
  const orderList = []
  dataList.map(item => {
    const skcList = item?.skcList || []
    skcList.map(sItem => {
      const supplierPriceReviewInfoList = sItem.supplierPriceReviewInfoList || []
      supplierPriceReviewInfoList.map(sItem => {
        orderList.push(sItem)
      })
    })
  })
  const response1 = await getData1(wholeUrl1, {
    data: {
      orderIds: map(orderList, 'priceOrderId')
    }
  })
  const priceReviewItemList = response1?.data?.priceReviewItemList || []
  orderList.map(item => {
    item.priceReviewItem = priceReviewItemList.find(sItem => sItem.id == item.priceOrderId)
  })
  return response0
}

module.exports = {
  getFullSearchForChainSupplierData
}
