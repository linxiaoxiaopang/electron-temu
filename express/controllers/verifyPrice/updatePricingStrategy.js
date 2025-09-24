const { groupBy, map, cloneDeep } = require('lodash')
const { getIsMock, getTemuTarget } =  require('../../const')
const { createProxyToGetTemuData } =  require('../../middleware/proxyMiddleware')
const { customIpcRenderer } = require('../../../model/utils/eventUtils')
const { ipcRendererInvokeAdd } = require('../../utils/dbDataUtils')

async function updateCreatePricingStrategy(req) {
  const { body } = req
  const relativeUrl = '/api/kiana/magnus/mms/price/bargain-no-bom/batch'
  const wholeUrl = `${getTemuTarget()}${relativeUrl}`
  const getData = createProxyToGetTemuData(req)
  const strategyList = strategyListCalculateCost(body?.strategyList || [])
  await ipcRendererInvokeAdd('db:temu:pricingStrategyHistory:add', strategyList)
  const [dbErr, dbRes] = await customIpcRenderer.invoke('db:temu:pricingStrategy:find', {
    where: {
      skuId: {
        ['op:in']: map(strategyList, 'skuId')
      }
    }
  })
  if (dbErr) return [dbErr, dbRes]
  const [delErr, delRes] = await customIpcRenderer.invoke('db:temu:pricingStrategy:delete', {
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
  if (getIsMock()) {
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
    let { isClose, minCost, maxCost, priceFixed, pricePercentage, alreadyPricingNumber, suggestSupplyPrice } = item
    let calculateCost = maxCost
    if (isClose) return maxCost
    if (priceFixed) {
      calculateCost = ceil(maxCost - priceFixed * alreadyPricingNumber)
    } else {
      calculateCost = ceil(maxCost - pricePercentage / 100 * maxCost)
    }
    if (suggestSupplyPrice && calculateCost < +suggestSupplyPrice) {
      calculateCost = suggestSupplyPrice
    }
    return max(calculateCost, minCost)
  }
}

async function updateLatestPricingStrategy(strategyList) {
  const [err, res] = await customIpcRenderer.invoke('db:temu:latestPricingStrategy:find', {
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
  await customIpcRenderer.invoke('db:temu:latestPricingStrategy:add', temArr)
  await customIpcRenderer.invoke('db:temu:latestPricingStrategy:add', temArr1)
}

module.exports = {
  updateCreatePricingStrategy
}
