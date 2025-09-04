import { updateCreatePricingStrategy } from '@/express/controllers/verifyPrice'
import { headers, temuTarget } from '@/express/const'
import { chunk, groupBy, isNil, map, merge } from 'lodash'
import proxyMiddleware from '@/express/middleware/proxyMiddleware'

export class UpdateCreatePricingStrategyTimer {
  constructor(
    { timerRecord }
  ) {
    this.strategyList = []
    this.updateRes = null
    this.timerRecord = timerRecord
  }

  get batchOperateResult() {
    return this.updateRes?.batchOperateResult || {}
  }

  get usedStrategyList() {
    return this.strategyList.filter(item => !item.isDelete && !item.isIgnore)
  }

  validHeaders() {
    if (!headers) throw 'headers 为空'
  }

  async getData() {
    const [err, res] = await window.ipcRenderer.invoke('db:temu:pricingStrategy:find', {
      where: {
        ['op:or']: [{
          mallId: headers?.mallid
        }]
      }
    })
    if (err) throw  res
    return res
  }

  async maskPassSearchForSemiSupplier() {
    const { strategyList } = this
    const productSkuIdList = map(strategyList, 'skuId')
    const pageSize = Object.keys(groupBy(strategyList, 'priceOrderId')).length
    const req = {
      body: {
        pageSize,
        mallId: headers?.mallid,
        productSkuIdList,
        supplierTodoTypeList: [1],
        pageNum: 1
      },
      method: 'POST',
      baseUrl: '/temu-agentseller',
      url: '/api/kiana/mms/robin/searchForSemiSupplier'
    }
    const res = {}
    const proxyMiddlewareFn = proxyMiddleware({
      target: () => {
        return temuTarget
      },
      isReturnData: true
    })
    const response = await proxyMiddlewareFn(req, res)
    const dataList = response?.dataList || []
    const flatSkuList = []
    dataList.map(item => {
      const hasToConfirmPriceReviewOrder = item.hasToConfirmPriceReviewOrder
      const skcList = item.skcList || []
      skcList.map(sItem => {
        let skuList = sItem.skuList || []
        skuList = skuList.map(gItem => {
          return {
            ...gItem,
            hasToConfirmPriceReviewOrder
          }
        })
        flatSkuList.push(...skuList)
      })
    })
    strategyList.map(item => {
      const fItem = flatSkuList.find(sItem => sItem.skuId == item.skuId)
      if (!fItem) {
        item.isDelete = true
        return
      }
      //判断是否已经在核价中，在核价中就跳过
      const { hasToConfirmPriceReviewOrder } = fItem
      if (!hasToConfirmPriceReviewOrder) {
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
    const [err, res] = await window.ipcRenderer.invoke('db:temu:pricingConfig:update', 1, obj)
    if (err) throw  res
    return res
  }

  async updateData() {
    const { usedStrategyList } = this
    if (!usedStrategyList.length) return
    await this.updatePricingConfig({
      completedTasks: 0,
      totalTasks: usedStrategyList.length
    })
    const chunkData = chunk(Object.values(groupBy(usedStrategyList, 'priceOrderId')), 1)
    let response = {}
    for (let chunk of chunkData) {
      const chunkStrategyList = []
      chunk.map(item => {
        chunkStrategyList.push(...item)
      })
      const [err, res] = await updateCreatePricingStrategy({
        method: 'POST',
        body: {
          mallId: headers?.mallid,
          strategyList: chunkStrategyList
        }
      })
      if (err) throw  res?.message
      merge(response, res?.data)
      await this.updatePricingConfig({
        completedTasks: chunkStrategyList.length
      })
    }
    return response
  }

  async deleteDataByResponse(deleteData) {
    if (!deleteData.length) return
    const [err, res] = await window.ipcRenderer.invoke('db:temu:pricingStrategy:delete', {
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
    const [err, res] = await window.ipcRenderer.invoke('db:temu:pricingStrategy:batchUpdate', updateData.map(item => {
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

  async action() {
    try {
      this.validHeaders()
      await this.updatePricingConfig({
        processing: true
      })
      this.strategyList = await this.getData()
      if(!this.strategyList.length) return
      await this.maskPassSearchForSemiSupplier()
      this.maskDeletePassRejectPriority()
      this.updateRes = await this.updateData()
      const { deleteData, updateData } = this.distinguishBatchOperateResult()
      await Promise.all([this.deleteDataByResponse(deleteData), this.updateDataByResponse(updateData)])
    } catch (err) {
      console.log('err', err)
    } finally {
      await this.updatePricingConfig({
        totalTasks: null,
        completedTasks: null,
        processing: false
      })
      await window.ipcRenderer.invoke('pricingConfig:timer:update:done')
    }
  }
}


window.ipcRenderer.on('pricingConfig:timer:update', async (event, timerRecord) => {
  const instance = new UpdateCreatePricingStrategyTimer({
    timerRecord
  })
  await instance.action()
})
