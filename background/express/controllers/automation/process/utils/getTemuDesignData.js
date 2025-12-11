const { getWholeUrl } = require('~store/user')
const { createProxyToGetTemuData } = require('~express/middleware/proxyMiddleware')
const { map } = require('lodash')

class GetTemuProductData {
  constructor(
    {
      req
    }
  ) {
    this.req = req
  }

  async getSubOrderList() {
    const { req } = this
    const relativeUrl = '/mms/venom/api/supplier/purchase/manager/querySubOrderList'
    const wholeUrl = getWholeUrl(relativeUrl)
    const query = {
      page: {
        pageIndex: 1,
        pageSize: 20
      },
      isCustomGoods: true,
      statusList: [1],
      oneDimensionSort: {
        firstOrderByParam: 'expectLatestDeliverTime',
        firstOrderByDesc: 0
      }
    }
    return await createProxyToGetTemuData(req)(wholeUrl, { data: query })
  }

  async getProductData(data) {
    const { req } = this
    const relativeUrl = '/bg-luna-agent-seller/product/customizeSku/pageQuery'
    const wholeUrl = getWholeUrl(relativeUrl)
    const query = {
      page: {
        pageIndex: 1,
        pageSize: 20
      },
      subPurchaseOrderSns: map(data, 'subPurchaseOrderSn')
    }
    return await createProxyToGetTemuData(req)(wholeUrl, { data: query })
  }

  async action() {

  }
}


module.exports = {
  GetTemuProductData
}
