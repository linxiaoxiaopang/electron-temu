import { isMock, temuTarget } from '@/express/const'
import { createProxyToGetTemuData } from '@/express/middleware/proxyMiddleware'
import { groupBy, map, cloneDeep } from 'lodash'

const { ipcRendererInvokeAdd } = require('@/express/utils/dbDataUtils')

export async function updateCreatePricingStrategy(req) {
  const { body } = req
  const relativeUrl = '/api/kiana/magnus/mms/price/bargain-no-bom/batch'
  const wholeUrl = `${temuTarget}${relativeUrl}`
  const getData = createProxyToGetTemuData(req)
  const strategyList = strategyListCalculateCost(body?.strategyList || [])
  await ipcRendererInvokeAdd('db:temu:pricingStrategyHistory:add', strategyList)
  const [dbErr, dbRes] = await window.ipcRenderer.invoke('db:temu:pricingStrategy:find', {
    where: {
      skuId: {
        ['op:in']: map(strategyList, 'skuId')
      }
    }
  })
  if (dbErr) return [dbErr, dbRes]
  const [delErr, delRes] = await window.ipcRenderer.invoke('db:temu:pricingStrategy:delete', {
    where: {
      id: {
        ['op:in']: map(dbRes, 'id')
      }
    }
  })
  if (delErr) return [delErr, delRes]
  const [addErr, addRes] = await ipcRendererInvokeAdd('db:temu:pricingStrategy:add', strategyList)
  if (addErr) return [addErr, addRes]
  const groupData = groupBy(strategyList, 'priceOrderId')
  const itemRequests = []
  Object.keys(groupData).map(key => {
    const values = groupData[key]
    const priceOrderId = key
    itemRequests.push({
      priceOrderId,
      items: values.map(item => {
        const { skuId: productSkuId, calculateCost: price } = item
        return {
          productSkuId,
          price
        }
      })
    })
  })
  body.itemRequests = itemRequests
  delete body.strategyList
  if (isMock) {
    const result = {
      batchOperateResult: Object.keys(groupData).reduce((acc, cur) => {
        acc[cur] = {
          success: true,
          priceOrderId: cur
        }
        return acc
      }, {})
    }
    return [false, result]
  }
  const response = await getData(wholeUrl)
  const needUpdateBatchOperateResult = []
  const batchOperateResult = response?.data?.batchOperateResult
  const keys = Object.keys(batchOperateResult || {})
  keys.map(key => {
    const item = batchOperateResult[key]
    if (!item.success) return
    const needUpdateItems = strategyList.filter(sItem => sItem.priceOrderId === item.priceOrderId)
    needUpdateBatchOperateResult.push(...needUpdateItems)
  })
  await updateLatestPricingStrategy(needUpdateBatchOperateResult)
  return [false, response?.data]
}

function strategyListCalculateCost(strategyList) {
  strategyList = cloneDeep(strategyList)
  return strategyList.map(item => {
    item.calculateCost = calcItemCalculateCost(item)
    return item
  })

  function calcItemCalculateCost(item) {
    const { max, ceil } = Math
    let { isClose, minCost, maxCost, priceFixed, pricePercentage, alreadyPricingNumber } = item
    let calculateCost = maxCost
    if (isClose) return maxCost
    if (priceFixed) {
      calculateCost = ceil(maxCost - priceFixed * alreadyPricingNumber)
    } else {
      calculateCost = ceil(maxCost - pricePercentage / 100 * maxCost)
    }
    return max(calculateCost, minCost)
  }
}

async function updateLatestPricingStrategy(strategyList) {
  const [err, res] = await window.ipcRenderer.invoke('db:temu:latestPricingStrategy:find', {
    where: {
      skuId: {
        ['op:in']: map(strategyList, 'skuId')
      }
    }
  })
  if (err) return
  const temArr = [...res]
  const temArr1 = []
  strategyList.map(item => {
    const fItem = res.find(sItem => sItem.skuId == item.skuId)
    if (fItem) {
      item.registerCount = fItem.registerCount + 1
      return
    }
    item.registerCount = 1
    temArr1.push(item)
  })
  await window.ipcRenderer.invoke('db:temu:latestPricingStrategy:add', temArr)
  await window.ipcRenderer.invoke('db:temu:latestPricingStrategy:add', temArr1)
}
