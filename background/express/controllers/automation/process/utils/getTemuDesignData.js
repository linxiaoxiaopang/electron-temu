const { getWholeUrl } = require('~store/user')
const { uploadToOssUseUrl } = require('~utils/oss')
const { throwPromiseError } = require('~utils/promise')
const { createProxyToGetTemuData } = require('~express/middleware/proxyMiddleware')
const { map, differenceBy, cloneDeep, chunk, isUndefined } = require('lodash')
const { LoopRequest } = require('~express/utils/loopUtils')
const { localRequest } = require('~express/utils/apiUtils')
const { deepCamelCaseKeys } = require('~utils/convert')
const automationProcessInitSheet = require('~model/temu/automation/automationProcess/init')
const personalProductInitSheet = require('~model/temu/automation/personalProduct/init')

const PROCESS_LIST = ['product:all:下载Temu效果图', 'product:all:下载Temu原图', 'product:all:temu更换系统数据']

class TemuProductProcessor {
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

  async uploadToOss(url) {
    if (!url) return ''
    const res = await uploadToOssUseUrl(url)
    if (!res?.url) throw '上传图片到oss失败'
    return res?.url
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
    return response?.data?.pageItems || []
  }

  async getProductDataByChunk(data) {
    const tmpData = []
    const chunkData = chunk(data, 50)
    for (let item of chunkData) {
      const res = await this.getProductData(item)
      tmpData.push(...res)
    }
    return tmpData
  }

  handleProduct(product) {
    const fItem = product
    const customizedPreviewItems = fItem?.productSkuCustomization?.customizedPreviewItems || []
    const customizedData = JSON.parse(fItem?.productSkuCustomization?.customizedData || '{}')
    let regions = customizedData?.surfaces[0]?.regions || []
    if (customizedData?.surfaces[0]?.regions) {
      customizedData.surfaces[0].regions = regions = deepCamelCaseKeys(regions)
    }
    const noUploadImageUrlRegions = regions.filter(item => {
      const element = item?.elements[0] || {}
      return element?.type == 1 && !element?.imageUrl
    })
    noUploadImageUrlRegions.map(item => {
      regions.find(sItem => {
        const element0 = sItem?.elements[0] || {}
        const element1 = item?.elements[0] || {}
        const isFind = element0.type == element1.type && element0.imageUrl
        if (isFind) {
          element1.userPlacementData = element0.userPlacementData
          element1.imageUrl = element0.imageUrl
          element1.isClone = true
          item.isClone = true
        }
        return isFind
      })
    })
    const addTextRegions = regions.filter(item => {
      const element = item?.elements[0] || {}
      return element?.type == 2 && !element?.text
    })

    // {
    //   "previewType": 4,
    //   "imageUrl": null,
    //   "imageUrlDisplay": null,
    //   "customizedText": "DON'TE",
    //   "regionId": "1"
    // }
    //temu平台添加了空文本
    if (addTextRegions.length) {
      regions.map((item, index) => {
        const element = item?.elements[0] || {}
        const isEmptyText = element?.type == 2 && !element?.text
        if (isEmptyText) {
          let rIndex = item?.elements[0]?.rIndex
          if (isUndefined(rIndex)) rIndex = index
          const textItem = {
            previewType: 4,
            imageUrl: null,
            imageUrlDisplay: null,
            customizedText: ' ',
            regionId: `${rIndex}`
          }
          customizedPreviewItems.splice(index + 1, 0, textItem)
        }
      })
    }

    if (noUploadImageUrlRegions.length) {
      fItem.productSkuCustomization.customizedData = JSON.stringify(customizedData)
      regions.map((item, index) => {
        if (item.isClone) {
          const fItem = customizedPreviewItems.find(sItem => sItem.previewType == 3)
          if (fItem) {
            const cloneItem = cloneDeep(fItem)
            let rIndex = item?.elements[0]?.rIndex
            if (isUndefined(rIndex)) rIndex = index
            cloneItem.regionId = `${rIndex}`
            customizedPreviewItems.splice(index + 1, 0, cloneItem)
          }
        }
      })
    }
    return product
  }

  async getDbPersonalProductData(productData) {
    const personalProductSkuIdList = map(productData, 'personalProductSkuId')
    const relativeUrl = '/temu-agentseller/api/automation/personalProduct/list'
    const response = await throwPromiseError(localRequest(relativeUrl, {
      data: {
        personalProductSkuIdList
      }
    }))
    return response?.data || []
  }

  async formatProductData(productData) {
    const existingSkuIdsData = await this.getDbPersonalProductData(productData)
    const existingSkuIdSet = new Set(existingSkuIdsData.map(item => item.personalProductSkuId))
    let newProductData = productData.filter(item => !existingSkuIdSet.has(item.personalProductSkuId))
    const pArr = newProductData.map(async product => {
      const { personalProductSkuId } = product
      this.handleProduct(product)
      const customizedPreviewItems = product?.productSkuCustomization?.customizedPreviewItems || []
      const fPreviewItem = customizedPreviewItems?.find(item => item.previewType == 1) || []
      const temuImageUrlDisplay = fPreviewItem?.imageUrlDisplay || ''
      const labelCustomizedPreviewItems = customizedPreviewItems.filter(item => item.previewType != 1)
      let ossImageUrlDisplay = ''
      let errorMsg = null
      const uploadPromises = []
      const p1 = this.uploadToOss(temuImageUrlDisplay).then(res => {
        ossImageUrlDisplay = res
      }).catch(err => {
        errorMsg = err
      })
      uploadPromises.push(p1)
      labelCustomizedPreviewItems.map(item => {
        if (!item.imageUrlDisplay) return
        const p = this.uploadToOss(item.imageUrlDisplay).then(res => {
          item.originOssImageUrlDisplay = res
          item.ossImageUrlDisplay = res
        }).catch(err => {
          errorMsg = err
        })
        uploadPromises.push(p)
      })
      await Promise.all(uploadPromises)
      const processData = {}
      processData[PROCESS_LIST[0]] = labelCustomizedPreviewItems
      if (temuImageUrlDisplay) {
        processData[PROCESS_LIST[1]] = labelCustomizedPreviewItems
        if (!errorMsg) {
          processData[PROCESS_LIST[2]] = labelCustomizedPreviewItems
        }
      }
      return {
        mallId: this.mallId,
        temuImageUrlDisplay,
        ossImageUrlDisplay,
        labelCustomizedPreviewItems,
        processData,
        personalProductSkuId,
        json: product
      }
    })
    return await Promise.all(pArr)
  }

  async action(data) {
    const productData = await this.getProductDataByChunk(data)
    const newProductData = await this.formatProductData(productData)
    if (newProductData.length) await personalProductInitSheet.server.add(newProductData)
    return await this.getDbPersonalProductData(productData)
  }
}

class GetTemuProductData {
  constructor(
    {
      req
    }
  ) {
    this.req = req
    this.productProcessor = new TemuProductProcessor({
      req
    })
  }

  get mallId() {
    return this.req?.body?.mallId
  }

  get subPurchaseOrderSn() {
    return this.req?.body?.subPurchaseOrderSn
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
    if (this.subPurchaseOrderSn) {
      finalQuery.subPurchaseOrderSnList = this.subPurchaseOrderSn
    }
    const response = await throwPromiseError(createProxyToGetTemuData(req)(wholeUrl, { data: finalQuery }))
    return response.data
  }

  async getDbData(data) {
    const uIdList = data.map(item => item.uId)
    const relativeUrl = '/temu-agentseller/api/automation/process/list'
    const response = await throwPromiseError(
      localRequest(relativeUrl, {
        data: {
          uIdList
        }
      }))
    return response?.data
  }

  async getNewData(productData) {
    const dbData = await this.getDbData(productData)
    return differenceBy(productData, dbData, 'uId')
  }

  handleSubOrderForSupplierList(data) {
    const tmpArr = []
    data.map(item => {
      const subOrder = cloneDeep(item)
      const skuQuantityDetailList = item.skuQuantityDetailList || []
      skuQuantityDetailList.map(sItem => {
        const tmpItem = sItem
        tmpItem.subOrder = subOrder
        tmpItem.uId = this.createUId(tmpItem)
        tmpArr.push(tmpItem)
      })
    })
    return tmpArr
  }

  async formatProcessData(skuQuantityDetailList, productData) {
    const processList = PROCESS_LIST
    return skuQuantityDetailList.map(item => {
      const { uId, fulfilmentProductSkuId } = item
      const { purchaseTime, subPurchaseOrderSn } = item.subOrder
      const productResult = productData.find(sItem => sItem.personalProductSkuId == fulfilmentProductSkuId)
      if (!productResult) throw `没有找到商品数据: ${fulfilmentProductSkuId}`
      const {
        personalProductSkuId,
        temuImageUrlDisplay = '',
        ossImageUrlDisplay = '',
        labelCustomizedPreviewItems = [],
        processData: productProcessData
      } = productResult
      const row = {
        uId,
        mallId: this.mallId,
        purchaseTime,
        subPurchaseOrderSn,
        personalProductSkuId,
        processList,
        currentProcess: '',
        temuData: item,
        systemExchangeData: null,
        temuImageUrlDisplay,
        ossImageUrlDisplay,
        processData: {},
        labelCustomizedPreviewItems
      }
      processList.map(key => {
        const sItem = productProcessData[key]
        if (!sItem) return
        row.currentProcess = key
        row.processData[key] = sItem
      })
      return row
    })
  }

  async saveProcessData(processData) {
    if (!processData.length) return [false, true]
    return await automationProcessInitSheet.server.add(processData)
  }

  async action() {
    const response = await this.getSubOrderList()
    const subOrderForSupplierList = response?.subOrderForSupplierList || []
    const newSkuQuantityDetailList = await this.getNewData(this.handleSubOrderForSupplierList(subOrderForSupplierList))
    if (newSkuQuantityDetailList.length) {
      // 先处理产品数据
      const productData = await this.productProcessor.action(newSkuQuantityDetailList)
      // 再处理流程数据
      const processData = await this.formatProcessData(newSkuQuantityDetailList, productData)
      await throwPromiseError(this.saveProcessData(processData))
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
      pageSize: 10
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
  LoopGetTemuProductData,
  GetTemuProductData
}
