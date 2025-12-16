const { getWholeUrl } = require('~store/user')
const { uploadToOssUseUrl } = require('~utils/oss')
const { createProxyToGetTemuData } = require('~express/middleware/proxyMiddleware')
const { map, differenceBy } = require('lodash')
const axios = require('axios')

class GetTemuProductData {
  constructor(
    {
      req
    }
  ) {
    this.req = req
  }

  get mallId() {
    return this.req?.body?.mallId
  }

  createUId(item) {
    return `${item.purchaseTime}_${item.productId}`
  }

  async getSubOrderList() {
    const { req, mallId } = this
    const relativeUrl = '/mms/venom/api/supplier/purchase/manager/querySubOrderList'
    const wholeUrl = getWholeUrl(relativeUrl)
    const finalQuery = {
      mallId,
      isCustomGoods: true,
      // statusList: [1],
      oneDimensionSort: {
        firstOrderByParam: 'expectLatestDeliverTime',
        firstOrderByDesc: 0
      }
    }
    const response = await createProxyToGetTemuData(req)(wholeUrl, { data: finalQuery })
    return response.data
  }

  async getProductData(data) {
    const { req, mallId } = this
    const relativeUrl = '/bg-luna-agent-seller/product/customizeSku/pageQuery'
    const wholeUrl = getWholeUrl(relativeUrl)
    const query = {
      mallId,
      subPurchaseOrderSns: map(data, 'subPurchaseOrderSn')
    }
    const response = await createProxyToGetTemuData(req)(wholeUrl, { data: query })
    return response?.data?.pageItems
  }

  async getDbData(data) {
    const { protocol, host } = this.req
    const uIdList = data.map(item => item.uId)
    const relativeUrl = '/temu-agentseller/api/automation/process/list'
    const wWholeUrl = `${protocol}://${host}${relativeUrl}`
    const response = await axios({
      method: 'post',
      url: wWholeUrl,
      data: {
        uIdList
      }
    })
    return response?.data?.data
  }

  async getNewData(productData) {
    const dbData = await this.getDbData(productData)
    return differenceBy(productData, dbData, 'uId')
  }

  async uploadToOss(url) {
    if (!url) return ''
    const res = await uploadToOssUseUrl(url)
    return res?.url
  }

  async formatData(newSubOrderList, productData) {
    const pArr = newSubOrderList.map(async item => {
      const { productId, uId, purchaseTime } = item
      const row = {
        uId,
        purchaseTime,
        // processList: ['product:产品:替换数据, picture:定制区域1:抠图?w=2000&h=2000', 'picture:定制区域1:psd模板?name=爱心&w=100,'],
        processList: ['product:产品:替换数据'],
        currentProcess: '替换数据',
        temuData: item,
        systemExchangeData: null,
        temuImageUrlDisplay: null,
        ossImageUrlDisplay: null,
        processData: {},
        labelCustomizedPreviewItems: []
      }
      const fItem = productData.find(sItem => sItem.productId == productId)
      if (!fItem) return
      item.productData = fItem
      const customizedPreviewItems = fItem?.productSkuCustomization?.customizedPreviewItems || []
      const fPreviewItem = customizedPreviewItems?.find(item => item.previewType == 1) || []
      row.labelCustomizedPreviewItems = customizedPreviewItems.filter(item => item.previewType != 1)
      row.temuImageUrlDisplay = fPreviewItem?.imageUrlDisplay || ''
      const pArr = []
      const p1 = this.uploadToOss(row.temuImageUrlDisplay).then(res => row.ossImageUrlDisplay = res)
      pArr.push(p1)
      row.labelCustomizedPreviewItems.map(item => {
        if (!item.imageUrlDisplay) return
        const p = this.uploadToOss(item.imageUrlDisplay).then(res => {
          item.ossImageUrlDisplay = res
        })
        pArr.push(p)
      })
      await Promise.all(pArr)
      return row
    })
    return await Promise.all(pArr)
  }

  async collectToDb(data) {
    const { protocol, host } = this.req
    const relativeUrl = '/temu-agentseller/api/automation/process/add'
    const wholeUrl = `${protocol}://${host}${relativeUrl}`
    const response = await axios({
      method: 'post',
      url: wholeUrl,
      data: {
        data
      }
    })
    return response
  }

  async submitDbData(newSubOrderForSupplierList, productData) {
    const data = await this.formatData(newSubOrderForSupplierList, productData)
    const response = await this.collectToDb(data)
    return [false, response?.data?.length || 0]
  }

  fillUid(data) {
    return data?.map(item => {
      item.uId = this.createUId(item)
      return item
    })
  }

  async action() {
    try {
      const response = await this.getSubOrderList()
      const subOrderForSupplierList = response?.subOrderForSupplierList || []
      const newSubOrderForSupplierList = await this.getNewData(this.fillUid(subOrderForSupplierList))
      const productData = await this.getProductData(newSubOrderForSupplierList)
      return await this.submitDbData(newSubOrderForSupplierList, productData)
    } catch (err) {
      return [true, err]
    }
  }
}


module.exports = {
  GetTemuProductData
}
