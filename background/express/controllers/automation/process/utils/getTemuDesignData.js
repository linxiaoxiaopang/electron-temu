const { getWholeUrl, agentsellerUs, getHeaders } = require('~store/user')
const { uploadToOssUseUrl } = require('~utils/oss')
const { throwPromiseError } = require('~utils/promise')
const { createProxyToGetTemuData } = require('~express/middleware/proxyMiddleware')
const { proxyRequest } = require('~express/utils/apiUtils')
const { map, differenceBy, cloneDeep, chunk, isUndefined, merge, last } = require('lodash')
const dayjs = require('dayjs')
const { LoopRequest } = require('~express/utils/loopUtils')
const { localRequest } = require('~express/utils/apiUtils')
const { deepCamelCaseKeys } = require('~utils/convert')
const { FormatY2Product } = require('./format')
const automationProcessInitSheet = require('~model/temu/automation/automationProcess/init')
const personalProductInitSheet = require('~model/temu/automation/personalProduct/init')
const { automationOrderTypeList, allProcessNodesMap } = require('~express/api/automation/const')

const CHANGE_SYSTEM_PRODUCT_DATA = allProcessNodesMap['product:all:temu更换系统数据']
const PROCESS_LIST = [allProcessNodesMap['product:all:下载Temu效果图'], allProcessNodesMap['product:all:下载Temu原图'], CHANGE_SYSTEM_PRODUCT_DATA]

class BaseTemuProductProcessor {
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
    const personalProductSkuIds = map(data, 'personalProductSkuId')
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

  async updateExistingData(dbExistingData, productData) {
    const updateData = []
    dbExistingData.map(item => {
      const { id, personalProductSkuId: dbPersonalProductSkuId, json: dbProductData } = item
      const fItem = productData.find(item => item.personalProductSkuId == dbPersonalProductSkuId)
      if (!fItem?.subPurchaseOrderInfoVOS?.length) return
      if (dbProductData?.subPurchaseOrderInfoVOS?.length) return
      updateData.push({
        id,
        json: fItem
      })
    })
    if (!updateData.length) return []
    return await throwPromiseError(personalProductInitSheet.server.batchUpdate(updateData))
  }

  async formatProductData(productData) {
    const existingSkuIdsData = await this.getDbPersonalProductData(productData)
    await this.updateExistingData(existingSkuIdsData, productData)
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
        errorMsg,
        temuImageUrlDisplay,
        ossImageUrlDisplay,
        labelCustomizedPreviewItems,
        processData,
        personalProductSkuId,
        json: product,
        mallId: this.mallId
      }
    })
    return await Promise.all(pArr)
  }

  async action(data) {
    const productData = await this.getProductDataByChunk(data)
    const newProductData = await this.formatProductData(productData)
    if (newProductData.length) await throwPromiseError(personalProductInitSheet.server.add(newProductData))
    return await this.getDbPersonalProductData(productData)
  }
}

class TemuProductProcessor extends BaseTemuProductProcessor {
  constructor(option) {
    super(option)
  }
}

class TemuY2ProductProcessor extends BaseTemuProductProcessor {
  constructor(option) {
    super(option)
  }

  async uploadToOss(url) {
    if (!url) return ''
    const urlInstance = new URL(url)
    const headers = await getHeaders(this.mallId, urlInstance.origin)
    const res = await uploadToOssUseUrl(url, headers)
    if (!res?.url) throw '上传图片到oss失败'
    return res?.url
  }

  async getProductData(data) {
    const { req, mallId } = this
    const relativeUrl = '/kirogi/bg/mms/queryCustomInfo'
    data = data[0]
    const finalQuery = {
      mallId,
      orderSn: data?.personalProductSkuId,
      parentOrderSn: data?.subPurchaseOrderSn
    }
    const response = await throwPromiseError(proxyRequest({
      req,
      relativeUrl,
      query: finalQuery,
      target: agentsellerUs
    }))
    response.data.order = data
    return response.data
  }

  async getProductDataByChunk(data) {
    const tmpData = []
    const chunkData = chunk(data, 1)
    for (let item of chunkData) {
      const res = await this.getProductData(item)
      tmpData.push(res)
    }
    return tmpData.map(item => {
      return new FormatY2Product({
        product: item
      }).action()
    })
  }
}

class BaseGetTemuProductData {
  constructor(
    {
      req
    }
  ) {
    this.req = req
    this.productProcessor = null
  }

  get orderType() {
    return automationOrderTypeList.normal
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
    const response = await this.getTemuData()
    return response?.total || response?.totalItemNum
  }

  async getTemuData() {
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

  handlePageItems(data) {
    const tmpArr = []
    data.map(item => {
      const subOrder = cloneDeep(item)
      const skuQuantityDetailList = item.skuQuantityDetailList || []
      skuQuantityDetailList.map(sItem => {
        const tmpItem = sItem
        tmpItem.subOrder = subOrder
        tmpItem.uId = this.createUId(tmpItem)
        tmpItem.personalProductSkuId = sItem.fulfilmentProductSkuId
        tmpArr.push(tmpItem)
      })
    })
    return tmpArr
  }

  formatProcessItem(item, productData) {
    const processList = [...PROCESS_LIST]
    const { uId, personalProductSkuId } = item
    const productResult = productData.find(sItem => sItem.personalProductSkuId == personalProductSkuId)
    if (!productResult) throw `没有找到商品数据: ${personalProductSkuId}`
    const {
      temuImageUrlDisplay = '',
      ossImageUrlDisplay = '',
      labelCustomizedPreviewItems = [],
      processData: productProcessData,
      errorMsg
    } = productResult
    const subPurchaseOrderInfoVOS = productResult?.json?.subPurchaseOrderInfoVOS || []
    const lastSubPurchaseOrderInfoVO = last(subPurchaseOrderInfoVOS)
    const row = {
      uId,
      processList,
      temuImageUrlDisplay,
      ossImageUrlDisplay,
      labelCustomizedPreviewItems,
      mallId: this.mallId,
      orderType: this.orderType,
      purchaseTime: null,
      createTime: null,
      subPurchaseOrderSn: lastSubPurchaseOrderInfoVO?.subPurchaseOrderSn || null,
      virtualSubPurchaseOrderSn: null,
      personalProductSkuId,
      currentProcess: '',
      temuData: item,
      systemExchangeData: null,
      processData: {},
      completeFlag: 0,
      errorMsg
    }
    if (errorMsg) row.completeFlag = 2
    processList.map(key => {
      const sItem = productProcessData[key]
      if (!sItem) return
      row.currentProcess = key
      row.processData[key] = sItem
    })
    return row
  }

  async formatProcessData(newPageItems, productData) {
    return newPageItems.map(item => {
      const { purchaseTime, subPurchaseOrderSn } = item.subOrder
      const row = this.formatProcessItem(item, productData)
      row.purchaseTime = purchaseTime
      row.subPurchaseOrderSn = subPurchaseOrderSn
      return row
    })
  }

  async saveProcessData(processData) {
    if (!processData.length) return [false, true]
    return await automationProcessInitSheet.server.add(processData)
  }

  getTemuDataPageItems(response) {
    return response?.subOrderForSupplierList || []
  }

  async action() {
    const response = await this.getTemuData()
    const pageItems = this.getTemuDataPageItems(response)
    const newPageItems = await this.getNewData(this.handlePageItems(pageItems))
    if (newPageItems.length) {
      // 先处理产品数据
      const productData = await this.productProcessor.action(newPageItems)
      // 再处理流程数据
      const processData = await this.formatProcessData(newPageItems, productData)
      await throwPromiseError(this.saveProcessData(processData))
    }
    return pageItems
  }
}

class GetTemuProductData extends BaseGetTemuProductData {
  constructor(option) {
    const { req } = option
    super(option)
    this.productProcessor = new TemuProductProcessor({
      req
    })
  }
}

class GetTemuProductDataForImage extends GetTemuProductData {
  constructor(option) {
    super(option)
  }

  get labelCreateTimeFrom() {
    return this.req?.body?.labelCreateTimeFrom
  }

  get labelCreateTimeTo() {
    return this.req?.body?.labelCreateTimeTo
  }

  get orderType() {
    return automationOrderTypeList.image
  }

  createUId(item) {
    return `temu-image_${item?.labelCodeVO?.personalProductSkuId}`
  }

  createVirtualSubPurchaseOrderSn(item) {
    return `temu-image_${item?.labelCodeVO?.personalProductSkuId}`
  }

  getDays(date) {
    const targetDate = dayjs(date)
    const timeTo = dayjs(this.labelCreateTimeTo || undefined)
    return Math.floor(timeTo.diff(targetDate, 'day')) + 1
  }

  async getTotal() {
    return this.getDays(this.labelCreateTimeFrom)
  }

  async getTemuData() {
    const { req, mallId } = this
    const relativeUrl = '/visage-agent-seller/labelcode/personalSku/pageQuery'
    const wholeUrl = getWholeUrl(relativeUrl)
    const finalQuery = {
      mallId
    }
    const response = await throwPromiseError(createProxyToGetTemuData(req)(wholeUrl, { data: finalQuery }))
    return response.data
  }

  handlePageItems(data) {
    const tmpArr = []
    const { labelCreateTimeFrom, labelCreateTimeTo } = this
    data.map(item => {
      const tmpItem = item
      tmpItem.subOrder = null
      tmpItem.uId = this.createUId(tmpItem)
      tmpItem.virtualSubPurchaseOrderSn = this.createVirtualSubPurchaseOrderSn(tmpItem)
      const { createTime: labelCreateTime, ...restLabelCodeVO } = item?.labelCodeVO || {}
      // labelCodeVO = {
      //   "supplierId": 634418219933178,
      //   "productId": 5275349203,
      //   "productSkcId": 33662163416,
      //   "productSkuId": 81634126655,
      //   "personalProductSkuId": 33006257719203,
      //   "labelCode": 79275529911,
      //   "skcExtCode": "BZ13",
      //   "skuExtCode": "DZAINP213BZ13-17",
      //   "createTime": 1772735060000
      // }
      merge(tmpItem, restLabelCodeVO)
      tmpItem.labelCreateTime = labelCreateTime
      tmpArr.push(tmpItem)
    })
    return tmpArr.filter(item => {
      if (!labelCreateTimeFrom) return item
      if (!labelCreateTimeTo) return item.labelCreateTime >= labelCreateTimeFrom
      return item.labelCreateTime >= labelCreateTimeFrom && item.labelCreateTime <= labelCreateTimeTo
    })
  }

  ignoreOnlyTextItem(row) {
    const { processList, labelCustomizedPreviewItems, currentProcess } = row
    const onlyText = labelCustomizedPreviewItems.every(item => item.previewType == 4)
    if (onlyText && labelCustomizedPreviewItems.length) {
      const fIndex = processList.findIndex(item => item == CHANGE_SYSTEM_PRODUCT_DATA)
      if (fIndex >= 0) {
        processList.splice(fIndex, 1)
        row.processList = processList
      }
      if (currentProcess == CHANGE_SYSTEM_PRODUCT_DATA) {
        row.currentProcess = ''
        row.completeFlag = 1
      }
    }
    return row
  }

  async formatProcessData(newPageItems, productData) {
    return newPageItems.map(item => {
      let row = this.formatProcessItem(item, productData)
      const { labelCreateTime, virtualSubPurchaseOrderSn } = item
      row.labelCreateTime = labelCreateTime
      row.virtualSubPurchaseOrderSn = virtualSubPurchaseOrderSn
      row = this.ignoreOnlyTextItem(row)
      return row
    })
  }

  getTemuDataPageItems(response) {
    return response?.pageItems || []
  }
}

class GetTemuProductDataForVirtualOrder extends GetTemuProductDataForImage {
  constructor(option) {
    super(option)
  }

  get orderType() {
    return automationOrderTypeList.virtual
  }

  createUId(item) {
    return `temu-virtual-order_${item?.labelCodeVO?.personalProductSkuId}`
  }

  createVirtualSubPurchaseOrderSn(item) {
    return `temu-virtual-order_${item?.labelCodeVO?.personalProductSkuId}`
  }

  async formatProcessData(newPageItems, productData) {
    return newPageItems.map(item => {
      let row = this.formatProcessItem(item, productData)
      const { labelCreateTime, virtualSubPurchaseOrderSn } = item
      row.labelCreateTime = labelCreateTime
      row.subPurchaseOrderSn = virtualSubPurchaseOrderSn
      row.virtualSubPurchaseOrderSn = virtualSubPurchaseOrderSn
      return row
    })
  }
}

class GetY2TemuProductData extends GetTemuProductData {
  constructor(option) {
    const { req } = option
    super(option)
    this.productProcessor = new TemuY2ProductProcessor({
      req
    })
  }

  get orderType() {
    return automationOrderTypeList.y2
  }

  createUId(item) {
    return `${item?.subOrder?.parentOrderMap?.parentOrderSn}_${item.orderSn}`
  }

  async getTemuData() {
    const { req, mallId } = this
    const relativeUrl = '/kirogi/bg/mms/recentOrderList'
    const finalQuery = {
      mallId,
      fulfillmentMode: 0,
      needBuySignService: 0,
      parentAfterSalesTag: 0,
      sellerNoteLabelList: [],
      queryType: 2,
      sortType: 1,
      timeZone: 'UTC+8'
    }
    if (this.subPurchaseOrderSn) {
      finalQuery.parentOrderSnList = this.subPurchaseOrderSn
    }
    const response = await throwPromiseError(proxyRequest({
      req,
      relativeUrl,
      query: finalQuery,
      target: agentsellerUs
    }))
    return response.data
  }

  getTemuDataPageItems(response) {
    return response?.pageItems || []
  }

  handlePageItems(data) {
    const tmpArr = []
    data.map(item => {
      const { orderList, parentOrderMap } = item
      item.skuQuantityDetailList = orderList.map(sItem => {
        return {
          orderSn: sItem.orderSn,
          skuQuantity: sItem.fulfillmentQuantity
        }
      })
      orderList.map(sItem => {
        sItem.subPurchaseOrderSn = parentOrderMap.parentOrderSn
      })
      const subOrder = cloneDeep(item)
      orderList.map(sItem => {
        const tmpItem = sItem
        tmpItem.subOrder = subOrder
        tmpItem.uId = this.createUId(tmpItem)
        tmpItem.personalProductSkuId = sItem.orderSn
        tmpItem.productSkuId = sItem.skuId
        tmpArr.push(tmpItem)
      })
    })
    return tmpArr
  }

  formatProcessItem(item, productData) {
    const row = super.formatProcessItem(item, productData)
    const rawProcessList = [...row.processList]
    const fIndex = rawProcessList.findIndex(item => item == CHANGE_SYSTEM_PRODUCT_DATA)
    rawProcessList.splice(fIndex, 0, allProcessNodesMap['order:all:存储报关信息'], allProcessNodesMap['order:all:申请Y2入仓单'], allProcessNodesMap['order:all:存储Y2入仓单'])
    row.processList = rawProcessList
    row.currentProcess = allProcessNodesMap['order:all:存储Y2入仓单']
    return row
  }

  async formatProcessData(newPageItems, productData) {
    return newPageItems.map(item => {
      const { parentOrderTimeStr, parentOrderSn } = item.subOrder.parentOrderMap
      const row = this.formatProcessItem(item, productData)
      row.purchaseTime = +new Date(parentOrderTimeStr)
      row.subPurchaseOrderSn = parentOrderSn
      return row
    })
  }
}

class baseLoopGetTemuProductData {
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
    this.loopRequestInstance = null
    this.getTemuProductDataInstance = null
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

class LoopGetTemuProductData extends baseLoopGetTemuProductData {
  constructor(option) {
    super(option)
    const { req, res } = option
    this.loopRequestInstance = new LoopRequest({
      req,
      res,
      cacheKey: `automationProcessSync_${this.body.mallId}`
    })
    this.getTemuProductDataInstance = new GetTemuProductData({ req })
  }
}

class LoopGetTemuProductDataForImage extends LoopGetTemuProductData {
  constructor(option) {
    super(option)
    const { req, res } = option
    this.loopRequestInstance = new LoopRequest({
      req,
      res,
      cacheKey: `automationProcessSyncForImage_${this.body.mallId}`
    })
    this.getTemuProductDataInstance = new GetTemuProductDataForImage(option)
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
      const lastItem = last(data)
      if (!lastItem) {
        return [false, {
          totalTasks,
          completedTasks: totalTasks
        }]
      }
      let completedTasks = this.getTemuProductDataInstance.getDays(lastItem?.labelCodeVO?.createTime)
      if (completedTasks > totalTasks) completedTasks = totalTasks
      req.body.page.pageIndex++
      return [false, {
        totalTasks,
        completedTasks
      }]
    }
    return await instance.action()
  }
}

class LoopGetTemuProductDataForVirtualOrder extends LoopGetTemuProductDataForImage {
  constructor(option) {
    super(option)
    const { req, res } = option
    this.loopRequestInstance = new LoopRequest({
      req,
      res,
      cacheKey: `automationProcessSyncForVirtualOrder_${this.body.mallId}`
    })
    this.getTemuProductDataInstance = new GetTemuProductDataForVirtualOrder(option)
  }
}

class LoopGetTemuProductDataForY2 extends LoopGetTemuProductData {
  constructor(option) {
    super(option)
    const { req, res } = option
    this.loopRequestInstance = new LoopRequest({
      req,
      res,
      cacheKey: `automationProcessSyncForY2_${this.body.mallId}`
    })
    this.getTemuProductDataInstance = new GetY2TemuProductData(option)
  }
}


module.exports = {
  LoopGetTemuProductData,
  LoopGetTemuProductDataForImage,
  LoopGetTemuProductDataForVirtualOrder,
  GetTemuProductData,
  GetTemuProductDataForImage,
  GetTemuProductDataForVirtualOrder,
  LoopGetTemuProductDataForY2
}
