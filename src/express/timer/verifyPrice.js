import { updateCreatePricingStrategy } from '@/express/controllers/verifyPrice'
import { headers } from '@/express/const'
import { isNil, map } from 'lodash'

export async function updateCreatePricingStrategyTimer() {
  if (!headers) return
  const [dbErr, dbRes] = await window.ipcRenderer.invoke('db:temu:pricingStrategy:find', {
    where: {
      ['op:or']: [{
        mallId: headers?.mallid
      }]
    }
  })
  if (dbErr || !dbRes) return
  const strategyList = dbRes
  if (!strategyList.length) return
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
        const { maxPricingNumber, alreadyPricingNumber } = item
        if (isNil(maxPricingNumber)) return false
        return maxPricingNumber == alreadyPricingNumber
      })
      const updateData = filterData.filter(item => {
        const { maxPricingNumber, alreadyPricingNumber } = item
        if (isNil(maxPricingNumber)) return true
        return maxPricingNumber != alreadyPricingNumber
      })
      delList.push(...delData)
      updateList.push(...updateData)
    }
  })
  if (delList.length) {
    await window.ipcRenderer.invoke('db:temu:pricingStrategy:delete', {
      where: {
        id: {
          ['op:in']: map(delList, 'id')
        }
      }
    })
  }
  if (updateList.length) {
    const [updateErr, updateRes] = await window.ipcRenderer.invoke('db:temu:pricingStrategy:batchUpdate', updateList.map(item => {
      const { alreadyPricingNumber, id } = item
      return {
        id,
        alreadyPricingNumber: alreadyPricingNumber + 1
      }
    }))
    console.log('updateRes', updateRes)
  }
}


window.ipcRenderer.on('pricingConfig:timer:update', async (event, res) => {
  await updateCreatePricingStrategyTimer()
})
