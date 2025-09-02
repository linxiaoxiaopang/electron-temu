import { updateCreatePricingStrategy } from '@/express/controllers/verifyPrice'
import { headers } from '@/express/const'
import { isNil, map } from 'lodash'

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

  filterByRejectPriority() {
    const { strategyList } = this
    if (!this.timerRecord.rejectPriority) return strategyList
    return strategyList.filter(item => {
      const { maxPricingNumber, alreadyPricingNumber } = item
      return maxPricingNumber > alreadyPricingNumber
    })
  }

  async updateData() {
    const { strategyList, timerRecord } = this
    const [err, res] = await updateCreatePricingStrategy({
      method: 'POST',
      body: {
        mallId: headers?.mallid,
        strategyList: this.filterByRejectPriority(strategyList),
        timerRecord
      }
    })
    if (err) throw  res
    return res
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
    const { batchOperateResult, strategyList } = this
    const updateList = []
    const delList = []
    Object.keys(batchOperateResult).map(key => {
      const item = batchOperateResult[key]
      const success = item.success
      if (success) {
        const filterData = strategyList.filter(sItem => sItem.priceOrderId == item.priceOrderId)
        const delData = filterData.filter(item => {
          const { maxPricingNumber, alreadyPricingNumber } = item
          if (isNil(maxPricingNumber)) return false
          return maxPricingNumber <= alreadyPricingNumber
        })
        const updateData = filterData.filter(item => {
          const { maxPricingNumber, alreadyPricingNumber } = item
          if (isNil(maxPricingNumber)) return true
          return maxPricingNumber > alreadyPricingNumber
        })
        delList.push(...delData)
        updateList.push(...updateData)
      }
    })
    return {
      deleteData: delList,
      updateData: updateList
    }
  }

  async action() {
    try {
      this.validHeaders()
      this.strategyList = await this.getData()
      this.updateRes = await this.updateData()
      const { deleteData, updateData } = this.distinguishBatchOperateResult()
      await Promise.all([this.deleteDataByResponse(deleteData), this.updateDataByResponse(updateData)])
    } catch (err) {
      console.log('err', err)
    }
  }
}


window.ipcRenderer.on('pricingConfig:timer:update', async (event, timerRecord) => {
  const instance = new UpdateCreatePricingStrategyTimer({
    timerRecord
  })
  await instance.action()
})
