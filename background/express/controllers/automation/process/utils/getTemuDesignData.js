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
      statusList: [1],
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

  formatData(newSubOrderList, productData) {
    return newSubOrderList.map(item => {
      const { productId, uId } = item
      const fItem = productData.find(sItem => sItem.productId == productId)
      if (!fItem) return
      const productSkuCustomization = fItem?.productSkuCustomization
      item.productData = fItem
      return {
        uId,
        processList: ['替换数据'],
        currentProcess: '替换数据',
        temuData: item,
        systemExchangeData: null,
        processData: {
          productSkuCustomization
        }
      }
    })
  }

  async uploadCustomizedPicture(item) {
    const pArr = []
    const productSkuCustomization = item.processData?.productSkuCustomization
    const customizationTmplSurfaces = productSkuCustomization?.customizationTmplSurfaces || []
    const pictureCustomizedPreviewItems = productSkuCustomization?.customizedPreviewItems?.filter(item => item.previewType == 1) || []
    customizationTmplSurfaces.map(sItem => {
      sItem.regions?.map((gItem, index) => {
        const { position: { x, y }, dimension: { width, height } } = gItem
        const pictureCustomizedPreviewItem = pictureCustomizedPreviewItems[index]
        const { imageUrlDisplay } = pictureCustomizedPreviewItem
        const originalPicture = `${imageUrlDisplay}&imageMogr2/cut/${width}x${height}x${x}x${y}`
        pictureCustomizedPreviewItem.originalPicture = originalPicture
        const p1 = uploadToOssUseUrl(imageUrlDisplay).then(res => {
          pictureCustomizedPreviewItem.ossImageUrlDisplay = res?.url
          return res?.url
        })
        const p2 = uploadToOssUseUrl(originalPicture).then(res => {
          pictureCustomizedPreviewItem.ossOriginalPicture = res?.url
          return res?.url
        })
        pArr.push(p1)
        pArr.push(p2)
      })
    })
    return await Promise.all(pArr)
  }

  async submitDbData(newSubOrderForSupplierList, productData) {
    const { protocol, host } = this.req
    const data = this.formatData(newSubOrderForSupplierList, productData)
    const pArr = data.map(async item => {
      await this.uploadCustomizedPicture(item)
    })
    await Promise.all(pArr)
    const relativeUrl = '/temu-agentseller/api/automation/process/add'
    const wholeUrl = `${protocol}://${host}${relativeUrl}`
    const response = await axios({
      method: 'post',
      url: wholeUrl,
      data: {
        data
      }
    })
    return response?.data
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
