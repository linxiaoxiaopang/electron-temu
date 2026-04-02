const { uniq, map, last, cloneDeep } = require('lodash')

class FormatY2Product {
  constructor(
    {
      product
    }
  ) {
    this.product = product
  }

  get order() {
    return this.product.order
  }

  get subOrder() {
    return this.order.subOrder
  }

  get orderList() {
    return this.subOrder.orderList
  }

  get productName() {
    return this.order.originalGoodsName
  }

  get productSkcId() {
    return this.order.skcId
  }

  get productSkuId() {
    return this.order.skuId
  }

  get productId() {
    return this.order.goodsId
  }

  get personalProductSkuId() {
    return this.order.personalProductSkuId
  }

  get extCode() {
    return last(this.order.extCodeList)
  }

  get displayImage() {
    return this.order.thumbUrl
  }

  get orderSn() {
    return this.order.orderSn
  }

  get subPurchaseOrderInfoVOS() {
    return this.orderList.map(sItem => {
      return {
        purchaseQuantity: sItem.fulfillmentQuantity,
        subPurchaseOrderSn: sItem.subPurchaseOrderSn
      }
    })
  }

  get subPurchaseOrderSnList() {
    return uniq(map(this.subPurchaseOrderInfoVOS, 'subPurchaseOrderSn'))
  }

  get customizedInfo() {
    return this.product.customizedInfo
  }

  get productSkuCustomization() {
    const customizedInfo = cloneDeep(this.customizedInfo)
    const customizedPreviewItems = customizedInfo.customizedPreviewItems = this.customizedInfo.previewList
    const fPreviewItem = customizedPreviewItems?.find(item => item.previewType == 1)
    fPreviewItem.imageUrlDisplay = fPreviewItem.imageUrl
    delete this.customizedInfo.previewList
    const labelCustomizedPreviewItems = customizedPreviewItems.filter(item => item.previewType != 1)
    labelCustomizedPreviewItems.map(item => {
      item.imageUrlDisplay = item.imageUrl
      item.regionId = item.customizedAreaId
      delete item.customizedAreaId
    })
    delete fPreviewItem.imageUrl
    return customizedInfo
  }

  action() {
    const {
      subOrder,
      productName,
      productSkcId,
      productSkuId,
      productId,
      personalProductSkuId,
      displayImage,
      orderSn,
      extCode,
      subPurchaseOrderInfoVOS,
      subPurchaseOrderSnList,
      productSkuCustomization
    } = this
    return {
      subOrder,
      productName,
      productSkcId,
      productSkuId,
      productId,
      personalProductSkuId,
      displayImage,
      orderSn,
      extCode,
      subPurchaseOrderInfoVOS,
      subPurchaseOrderSnList,
      productSkuCustomization
    }
  }
}

module.exports = {
  FormatY2Product
}
