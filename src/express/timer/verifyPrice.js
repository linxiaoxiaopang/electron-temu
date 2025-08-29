import { updateCreatePricingStrategy } from '@/express/controllers/verifyPrice'
import { headers } from '@/express/const'
import { map } from 'lodash'

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
          ['json:json.mallId']: headers?.mallid
        }]
      }
    })
    if (dbErr || !dbRes) return
    const strategyList = dbRes.map(item => JSON.parse(item.json))
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
        const filterData = strategyList.filter(sItem => sItem.priceOrderId === item.priceOrderId)
        const delData = filterData.filter(item => (item.maxPricingNumber - 1) == 0)
        const updateData = filterData.filter(item => (item.maxPricingNumber - 1) > 0)
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
    if(updateList) {

    }
  }
}


updateCreatePricingStrategyTimer()
