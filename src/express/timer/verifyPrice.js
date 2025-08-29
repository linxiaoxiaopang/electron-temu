import { updateCreatePricingStrategy } from '@/express/controllers/verifyPrice'
import { headers } from '@/express/const'
import { isNil, map } from 'lodash'

export function updateCreatePricingStrategyTimer() {
  setTimeout(async () => {
    await updateDb()
    updateCreatePricingStrategyTimer()
  }, 1000 * 10)

  async function updateDb() {
    if (!headers) return
    const [dbErr, dbRes] = await window.ipcRenderer.invoke('db:temu:updateCreatePricingStrategy:find', {
      where: {
        ['op:or']: [{
          mallId: headers?.mallid
        }]
      }
    })
    if (dbErr || !dbRes) return
    const strategyList = dbRes
    if(!strategyList.length) return
    const [updateErr, updateRes] = await updateCreatePricingStrategy({
      method: 'POST',
      body: {
        mallId: headers?.mallid,
        strategyList
      }
    })
    if (updateErr) return
    const batchOperateResult = updateRes?.batchOperateResult || {}
    const updateList = []
    const delList = []
    Object.keys(batchOperateResult).map(key => {
      const item = batchOperateResult[key]
      const success = item.success
      if (success) {
        const filterData = strategyList.filter(sItem => sItem.priceOrderId == item.priceOrderId)
        const delData = filterData.filter(item => {
          const { maxPricingNumber } = item
          if (isNil(maxPricingNumber)) return false
          return maxPricingNumber - 1 == 0
        })
        const updateData = filterData.filter(item => {
          const { maxPricingNumber } = item
          if (isNil(maxPricingNumber)) return true
          return maxPricingNumber - 1 != 0
        })
        delList.push(...delData)
        updateList.push(...updateData)
      }
    })
    if (delList.length) {
      await window.ipcRenderer.invoke('db:temu:updateCreatePricingStrategy:delete', {
        where: {
          id: {
            ['op:in']: map(delList, 'id')
          }
        }
      })
    }
    if (updateList.length) {
      const [updateErr, updateRes] = await window.ipcRenderer.invoke('db:temu:updateCreatePricingStrategy:batchUpdate', updateList.map(item => {
        const { maxPricingNumber, id } = item
        return {
          id,
          maxPricingNumber: isNil(maxPricingNumber) ? null : maxPricingNumber - 1,
        }
      }))
      console.log('updateRes', updateRes)
    }
  }
}


updateCreatePricingStrategyTimer()
