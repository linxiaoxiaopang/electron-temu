const axios = require('axios')
const { LoopRequest } = require('../../utils/loopUtils')
const { map, uniqBy } = require('lodash')
const { updateCreatePricingStrategy } = require('../../controllers/verifyPrice/updatePricingStrategy')
const { customIpcRenderer } = require('~/utils/event')

async function latest(req, res, next) {
  const { body } = req
  const { startUpdateTime, endUpdateTime, mallId } = body
  const skuIdList = body?.skuIdList || []
  const where = {
    mallId,
    skuId: {
      'op:in': skuIdList
    }
  }
  if (startUpdateTime && endUpdateTime) {
    where.updateTime = {
      'op:between': [startUpdateTime, endUpdateTime]
    }
  }
  res.customResult = await customIpcRenderer.invoke('db:temu:latestPricingStrategy:find', {
    where
  })
  next()
}


async function update(req, res, next) {
  res.customResult = await updateCreatePricingStrategy(req)
  next()
}

async function validate(req, res, next) {
  const { body, protocol, host } = req
  const { mallId, extCodeLike, startUpdateTime, endUpdateTime } = body

  const instance = new LoopRequest({
    req,
    res,
    cacheKey: 'validatePricingStrategy'
  })

  const query = {
    mallId,
    extCodeLike,
    page: {
      pageIndex: 1,
      pageSize: 200
    }
  }
  const errorData = []
  instance.requestCallback = async () => {
    const relativeUrl1 = '/temu-agentseller/api/verifyPrice/searchForChainSupplier/list'
    const relativeUrl2 = '/temu-agentseller/api/verifyPrice/pricingStrategy/latest'
    const wWholeUrl1 = `${protocol}://${host}${relativeUrl1}`
    const wWholeUrl2 = `${protocol}://${host}${relativeUrl2}`
    const response1 = await axios({
      method: 'post',
      url: wWholeUrl1,
      data: query
    })
    if (response1?.data?.code !== 0) return [false, response1.data?.message]
    const flatSkuList = []
    const totalTasks = response1?.data?.data?.total
    const dataList = response1?.data?.data?.dataList
    const tasks = dataList.length
    dataList.map(item => {
      const skcList = item.skcList || []
      skcList.map(sItem => {
        const skuList = (sItem.skuList || []).map(gItem => {
          return {
            ...gItem,
            extCode: sItem.extCode
          }
        })
        flatSkuList.push(...skuList)
      })
    })
    const response2 = await axios({
      method: 'post',
      url: wWholeUrl2,
      data: {
        mallId,
        startUpdateTime,
        endUpdateTime,
        skuIdList: map(flatSkuList, 'skuId')
      }
    })
    if (response2.data?.code !== 0) return [false, response2.data?.message]
    const response2Data = response2?.data?.data || []
    const rawErrorData = flatSkuList.filter(item => !response2Data.find(sItem => sItem.skuId == item.skuId))
    const uniqErrorData = map(uniqBy(rawErrorData, 'extCode'), 'extCode')
    errorData.push(...uniqErrorData)
    if (query.page.pageIndex == 1) {
      res.customResult = [false, {
        errorData,
        requestUuid: instance.uuid,
        totalTasks,
        completedTasks: tasks
      }]
      next()
    }
    query.page.pageIndex++
    return [false, {
      totalTasks,
      tasks,
      errorData
    }]
  }
  res.customResult = await instance.action()
  next()
}


module.exports = {
  latest,
  update,
  validate
}
