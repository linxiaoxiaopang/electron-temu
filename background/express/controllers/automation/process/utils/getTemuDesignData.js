const { getWholeUrl } = require('~store/user')
const { uploadToOssUseUrl } = require('~utils/oss')
const { throwPromiseError } = require('~utils/promise')
const { createProxyToGetTemuData } = require('~express/middleware/proxyMiddleware')
const { map, differenceBy, cloneDeep } = require('lodash')
const { LoopRequest } = require('~express/utils/loopUtils')

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
    return `${item.subOrder.subPurchaseOrderSn}_${item.fulfilmentProductSkuId}`
  }

  async getTotal() {
    const response = await this.getSubOrderList()
    return response?.total
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
    const response = await throwPromiseError(createProxyToGetTemuData(req)(wholeUrl, { data: finalQuery }))
    return response.data
  }

  async getProductData(data) {
    const { req, mallId } = this
    const relativeUrl = '/bg-luna-agent-seller/product/customizeSku/pageQuery'
    const wholeUrl = getWholeUrl(relativeUrl)
    const personalProductSkuIds = map(data, 'fulfilmentProductSkuId')
    const query = {
      mallId,
      personalProductSkuIds,
      page: {
        pageSize: personalProductSkuIds.length,
        pageIndex: 1
      }
    }
    const response = await throwPromiseError(createProxyToGetTemuData(req)(wholeUrl, { data: query }))
    return response?.data?.pageItems
  }

  async getDbData(data) {
    const { protocol, host } = this.req
    const uIdList = data.map(item => item.uId)
    const relativeUrl = '/temu-agentseller/api/automation/process/list'
    const wWholeUrl = `${protocol}://${host}${relativeUrl}`
    const response = await throwPromiseError(axios({
      method: 'post',
      url: wWholeUrl,
      data: {
        uIdList
      }
    }))
    return response?.data?.data
  }

  async getNewData(productData) {
    const dbData = await this.getDbData(productData)
    return differenceBy(productData, dbData, 'uId')
  }

  async uploadToOss(url) {
    if (!url) return ''
    const res = await uploadToOssUseUrl(url)
    if (!res?.url) throw '上传图片到oss失败'
    return res?.url
  }

  // processList
  // product:all:下载Temu图片
  // product:all:temu更换系统数据
  // label?name=定制区域1:picture:抠图
  // label?name=定制区域1:picture:轮廓?w=10
  // label?name=定制区域1:picture:psd模板?name=人头替换&w=2000&h=2000
  // label?name=定制区域2:text:轮廓?w=10
  // product:all:上传文字校验
  // product:all:上传原图
  // product:all:上传预览图
  // product:all:导入微定制订单
  // product:all:创建产品

  async formatData(skuQuantityDetailList, productData) {
    const { mallId } = this
    const pArr = skuQuantityDetailList.map(async item => {
      const { uId, fulfilmentProductSkuId } = item
      const { purchaseTime, subPurchaseOrderSn } = item.subOrder
      const row = {
        uId,
        mallId,
        purchaseTime,
        subPurchaseOrderSn,
        processList: ['product:all:下载Temu效果图', 'product:all:下载Temu原图', 'product:all:temu更换系统数据'],
        currentProcess: '',
        temuData: item,
        systemExchangeData: null,
        temuImageUrlDisplay: null,
        ossImageUrlDisplay: null,
        processData: {},
        labelCustomizedPreviewItems: []
      }
      const fItem = productData.find(sItem => sItem.personalProductSkuId == fulfilmentProductSkuId)
      if (!fItem) return
      item.productData = fItem
      const customizedPreviewItems = fItem?.productSkuCustomization?.customizedPreviewItems || []
      const fPreviewItem = customizedPreviewItems?.find(item => item.previewType == 1) || []
      row.labelCustomizedPreviewItems = customizedPreviewItems.filter(item => item.previewType != 1)
      row.temuImageUrlDisplay = fPreviewItem?.imageUrlDisplay || ''
      const pArr = []
      const p1 = this.uploadToOss(row.temuImageUrlDisplay).then(res => row.ossImageUrlDisplay = res).catch(err => {
        row.errorMsg = err
      })
      pArr.push(p1)
      row.labelCustomizedPreviewItems.map(item => {
        if (!item.imageUrlDisplay) return
        const p = this.uploadToOss(item.imageUrlDisplay).then(res => {
          item.ossImageUrlDisplay = res
        }).catch(err => {
          row.errorMsg = err
        })
        pArr.push(p)
      })
      await Promise.all(pArr)
      if (!row.temuImageUrlDisplay) {
        row.currentProcess = row.processList[0]
      } else if (row.errorMsg) {
        row.currentProcess = row.processList[1]
      } else {
        row.currentProcess = row.processList[2]
      }
      row.processData[row.currentProcess] = row.labelCustomizedPreviewItems
      return row
    })
    return await Promise.all(pArr)
  }

  async collectToDb(data) {
    const { protocol, host } = this.req
    const relativeUrl = '/temu-agentseller/api/automation/process/add'
    const wholeUrl = `${protocol}://${host}${relativeUrl}`
    const response = await throwPromiseError(axios({
      method: 'post',
      url: wholeUrl,
      data: {
        data
      }
    }))
    return response
  }

  async submitDbData(skuQuantityDetailList, productData) {
    const data = await this.formatData(skuQuantityDetailList, productData)
    if (!data.length) return
    return await this.collectToDb(data)
  }


  handleSubOrderForSupplierList(data) {
    const tmpArr = []
    data.map(item => {
      const skuQuantityDetailList = item.skuQuantityDetailList || []
      if (!skuQuantityDetailList.length) {
        console.log('skuQuantityDetailList', skuQuantityDetailList)
      }
      skuQuantityDetailList.map(sItem => {
        const tmpItem = sItem
        tmpItem.subOrder = cloneDeep(item)
        tmpItem.uId = this.createUId(tmpItem)
        tmpArr.push(tmpItem)
      })
    })
    return tmpArr
  }

  async action() {
    const response = await this.getSubOrderList()
    const subOrderForSupplierList = response?.subOrderForSupplierList || []
    // const newSubOrderForSupplierList = await this.getNewData(this.fillUid(subOrderForSupplierList))
    const newSkuQuantityDetailList = await this.getNewData(this.handleSubOrderForSupplierList(subOrderForSupplierList))
    if (newSkuQuantityDetailList.length) {
      const productData = await this.getProductData(newSkuQuantityDetailList)
      await this.submitDbData(newSkuQuantityDetailList, productData)
    }
    return subOrderForSupplierList
  }
}

class LoopGetTemuProductData {
  constructor(
    {
      req,
      res
    }
  ) {
    this.req = req
    this.res = res
    this.body.page = {
      pageIndex: 1,
      pageSize: 20
    }
    this.loopRequestInstance = new LoopRequest({
      req,
      res,
      cacheKey: `automationProcessSync_${this.body.mallId}`
    })
    this.getTemuProductDataInstance = new GetTemuProductData({ req })
  }

  get body() {
    return this.req.body || {}
  }

  async getTotal() {
    return await this.getTemuProductDataInstance.getTotal()
  }

  async getMoreData() {
    return await this.getTemuProductDataInstance.action()
  }

  async loopRequest() {
    const { loopRequestInstance: instance, req } = this
    let totalTasks = 0
    await instance.abandonCacheInstanceRequest()
    instance.requestCallback = async () => {
      if (instance.summary.totalTasks == 0) {
        totalTasks = await this.getTotal()
        return [false, {
          totalTasks,
          requestUuid: instance.uuid,
          tasks: 0,
          completedTasks: 0
        }]
      }
      const data = await this.getMoreData()
      const tasks = data.length
      req.body.page.pageIndex++
      return [false, {
        totalTasks,
        tasks
      }]
    }
    return await instance.action()
  }

  async action() {
    try {
      return await this.loopRequest()
    } catch (err) {
      return [true, err]
    }
  }
}


module.exports = {
  LoopGetTemuProductData
}
