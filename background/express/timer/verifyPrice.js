const { emitter } = require('../../utils/event')
const { updateCreatePricingStrategy } = require('../controllers/verifyPrice/updatePricingStrategy')
const { getMallIds, getMall, MALL_SOLE } = require('~store/user')
const { chunk, groupBy, isNil, map, merge } = require('lodash')
const { customIpcRenderer } = require('~/utils/event')
const { GetSearchForSupplierByManagedType } = require('~express/controllers/verifyPrice/searchForChainSupplier/utils/getFullSearchForChainSupplierData')
const { traverseActivity } = require('~express/controllers/batchReportingActivities/batchReportingActivities')

class UpdateCreatePricingStrategyTimer {
  constructor(
    {
      timerRecord,
      mallId,
      parent
    }
  ) {
    this.mallId = mallId
    this.parent = parent
    this.timerRecord = timerRecord
    this.strategyList = []
    this.updateRes = null
    this.list = {
      [MALL_SOLE.semiSole]: {
        getFlatSkuList: (data) => {
          const flatSkuList = []
          traverseActivity({
            data,
            skuCallback: (skuItem, skcItem, productItem) => {
              const { hasToConfirmPriceReviewOrder } = productItem
              flatSkuList.push({
                ...skuItem,
                hasToConfirm: hasToConfirmPriceReviewOrder
              })
            }
          })
          return flatSkuList
        }
      },

      [MALL_SOLE.fullSole]: {
        getFlatSkuList: (data) => {
          const flatSkuList = []
          traverseActivity({
            data,
            skuCallback: (skuItem, skcItem) => {
              const supplierPriceReviewInfoList = skcItem?.supplierPriceReviewInfoList || []
              const hasToConfirm = supplierPriceReviewInfoList.every(item => item.status == 1)
              flatSkuList.push({
                ...skuItem,
                hasToConfirm
              })
            }
          })
          return flatSkuList
        }
      }
    }
  }

  get mall() {
    return getMall(this.mallId)
  }

  get managedType() {
    return this.mall?.userInfo?.mallList?.[0].managedType
  }

  get batchOperateResult() {
    return this.updateRes?.batchOperateResult || {}
  }

  get usedStrategyList() {
    return this.strategyList.filter(item => !item.isDelete && !item.isIgnore)
  }

  get option() {
    return this.list[this.managedType]
  }

  validMallId() {
    if (!this.mallId) throw 'mallId 为空'
  }

  async getData() {
    const [err, res] = await customIpcRenderer.invoke('db:temu:pricingStrategy:find', {
      where: {
        ['op:or']: [{
          mallId: this.mallId
        }]
      }
    })
    if (err) throw  res
    return res
  }

  async getAllDataByPriceOrderId() {
    const { strategyList } = this
    const productSkuIdList = map(strategyList, 'skuId')
    const req = {
      body: {
        mallId: this.mallId
      },
      customData: {
        managedType: this.managedType
      },
      method: 'POST',
      baseUrl: '/temu-agentseller',
      url: '/api/kiana/mms/robin/searchForSemiSupplier'
    }
    const instance = new GetSearchForSupplierByManagedType({
      req
    })
    return await instance.getDataByProductSkuIdList(productSkuIdList)
  }

  async maskPassSearchForSemiSupplier() {
    const { strategyList } = this
    const dataList = await this.getAllDataByPriceOrderId()
    const flatSkuList = this.option.getFlatSkuList(dataList)
    strategyList.map(item => {
      const fItem = flatSkuList.find(sItem => sItem.skuId == item.skuId)
      if (!fItem) {
        item.isDelete = true
        return
      }
      if (fItem.priceReviewStatus != 0 && fItem.priceReviewStatus != 1) {
        item.isDelete = true
        return
      }
      //判断是否已经在核价中，在核价中就跳过
      const { hasToConfirm } = fItem
      if (!hasToConfirm) {
        item.isIgnore = true
      }
    })
  }

  maskDeletePassRejectPriority() {
    const { strategyList } = this
    if (!this.timerRecord?.rejectPriority) return
    strategyList.map(item => {
      const { maxPricingNumber, alreadyPricingNumber, isDelete } = item
      if (isDelete) return
      item.isDelete = maxPricingNumber <= alreadyPricingNumber
    })
  }

  async updatePricingConfig(obj) {
    const [err, res] = await customIpcRenderer.invoke('db:temu:pricingConfig:update', 1, obj)
    if (err) throw  res
    return res
  }

  async updateData() {
    const { usedStrategyList } = this
    if (!usedStrategyList.length) return
    const chunkData = chunk(Object.values(groupBy(usedStrategyList, 'priceOrderId')), 50)
    let response = {}
    for (let chunk of chunkData) {
      const chunkStrategyList = []
      chunk.map(item => {
        chunkStrategyList.push(...item)
      })
      const [err, res] = await updateCreatePricingStrategy({
        method: 'POST',
        customData: {
          managedType: this.managedType
        },
        body: {
          mallId: this.mallId,
          strategyList: chunkStrategyList
        }
      })
      if (err) throw  res
      merge(response, res)
      await this?.parent?.updatePricingConfig({
        completedTasks: chunkStrategyList.length
      })
    }
    return response
  }

  async deleteDataByResponse(deleteData) {
    if (!deleteData.length) return
    const [err, res] = await customIpcRenderer.invoke('db:temu:pricingStrategy:delete', {
      where: {
        id: {
          ['op:in']: map(deleteData, 'id')
        }
      }
    })
    if (err) throw res
    return res
  }

  async updateDataByResponse(updateData) {
    if (!updateData.length) return
    const [err, res] = await customIpcRenderer.invoke('db:temu:pricingStrategy:batchUpdate', updateData.map(item => {
      const { alreadyPricingNumber, id } = item
      return {
        id,
        alreadyPricingNumber: alreadyPricingNumber + 1
      }
    }))
    if (err) throw res
    console.log('res', res)
    return res
  }

  distinguishBatchOperateResult() {
    const { batchOperateResult, usedStrategyList, strategyList } = this
    const updateList = []
    const delList = strategyList.filter(item => item.isDelete)
    Object.keys(batchOperateResult).map(key => {
      const item = batchOperateResult[key]
      if (!item) return
      const success = item.success
      const filterData = usedStrategyList.filter(sItem => sItem.priceOrderId == item.priceOrderId)
      let delData = []
      let updateData = []
      // if (!success) {
      //   delData = filterData
      //   delList.push(...delData)
      //   return
      // }
      delData = filterData.filter(item => {
        const { maxPricingNumber, alreadyPricingNumber } = item
        if (isNil(maxPricingNumber)) return false
        return maxPricingNumber <= alreadyPricingNumber
      })
      updateData = filterData.filter(item => {
        const { maxPricingNumber, alreadyPricingNumber } = item
        if (isNil(maxPricingNumber)) return true
        return maxPricingNumber > alreadyPricingNumber
      })
      delList.push(...delData)
      updateList.push(...updateData)
    })
    return {
      deleteData: delList,
      updateData: updateList
    }
  }

  async prepare() {
    this.validMallId()
    this.strategyList = await this.getData()
    if (!this.strategyList.length) return
    await this.maskPassSearchForSemiSupplier()
    this.maskDeletePassRejectPriority()
  }

  async action() {
    this.updateRes = await this.updateData()
    const { deleteData, updateData } = this.distinguishBatchOperateResult()
    await Promise.all([this.deleteDataByResponse(deleteData), this.updateDataByResponse(updateData)])
  }
}

class BatchUpdateCreatePricingStrategyTimer {
  constructor(
    {
      timerRecord,
      mallIds = []
    }
  ) {
    this.timerRecord = timerRecord
    this.mallIds = mallIds
    this.instanceList = this.mallIds.map(mallId => {
      return new UpdateCreatePricingStrategyTimer({
        mallId,
        parent: this,
        timerRecord: this.timerRecord
      })
    })
  }

  validMallIds() {
    if (!this.mallIds.length) throw 'mallIds 为空'
  }

  async updatePricingConfig(obj) {
    const [err, res] = await customIpcRenderer.invoke('db:temu:pricingConfig:update', 1, obj)
    if (err) throw  res
    return res
  }

  async action() {
    try {
      this.validMallIds()
      await this.updatePricingConfig({
        processing: true
      })

      for (let i = 0; i < this.instanceList.length; i++) {
        const item = this.instanceList[i]
        await item.prepare()
      }

      const totalTasks = this.instanceList.reduce((total, item) => {
        return total + item.usedStrategyList.length
      }, 0)

      await this.updatePricingConfig({
        totalTasks,
        completedTasks: 0
      })

      for (let i = 0; i < this.instanceList.length; i++) {
        const item = this.instanceList[i]
        await item.action()
      }
    } catch (err) {
      console.log('err', err)
    } finally {
      await this.updatePricingConfig({
        totalTasks: null,
        completedTasks: null,
        processing: false
      })
      emitter.emit('pricingConfig:timer:update:done')
    }
  }
}

emitter.on('pricingConfig:timer:update', async (timerRecord) => {
  const instance = new BatchUpdateCreatePricingStrategyTimer({
    timerRecord,
    mallIds: getMallIds()
  })
  await instance.action()
})

module.exports = {
  BatchUpdateCreatePricingStrategyTimer
}
