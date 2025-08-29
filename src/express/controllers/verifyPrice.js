import { isMock, temuTarget } from '@/express/const'
import { createProxyToGetTemuData } from '@/express/middleware/proxyMiddleware'
import { groupBy, map } from 'lodash'

export async function updateCreatePricingStrategy(req) {
  const { body } = req
  const relativeUrl = '/api/kiana/magnus/mms/price/bargain-no-bom/batch'
  const wholeUrl = `${temuTarget}${relativeUrl}`
  const getData = createProxyToGetTemuData(req)
  const strategyList = body?.strategyList || []
  const [dbErr, dbRes] = await window.ipcRenderer.invoke('db:temu:updateCreatePricingStrategy:find', {
    where: {
      ['op:or']: strategyList.map(item => {
        return {
          ['op:and']: [
            {
              ['json:json.skuId']: item.skuId
            },
            {
              ['json:json.priceOrderId']: item.priceOrderId
            }
          ]
        }
      })
    }
  })
  if (dbErr) return [dbErr, dbRes]
  const [delErr, delRes] = await window.ipcRenderer.invoke('db:temu:updateCreatePricingStrategy:delete', {
    where: {
      id: {
        ['op:in']: map(dbRes, 'id')
      }
    }
  })
  if (delErr) return [delErr, delRes]
  const [addErr, addRes] = await window.ipcRenderer.invoke('db:temu:updateCreatePricingStrategy:add', strategyList.map(item => {
    return { json: item }
  }))
  if (addErr) return [addErr, addRes]
  const groupData = groupBy(strategyList, 'priceOrderId')
  const itemRequests = []
  Object.keys(groupData).map(key => {
    const values = groupData[key]
    const priceOrderId = key
    itemRequests.push({
      priceOrderId,
      items: values.map(item => {
        const { skuId: productSkuId, maxCost: price } = item
        return {
          productSkuId,
          price
        }
      })
    })
  })
  body.itemRequests = itemRequests
  delete body.strategyList
  if (isMock) return [false, null]
  const response = await getData(wholeUrl)
  return [false, response]
}
