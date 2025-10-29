const { getFullSearchForChainSupplierData } = require('../../controllers/verifyPrice/searchForChainSupplier')
const { LoopRequest } = require('../../utils/loopUtils')
const { customIpcRenderer } = require('~/utils/event')

async function sync(req, res, next) {
  const { mallId } = req.body
  const instance = new LoopRequest({
    req,
    res,
    cacheKey: 'syncSearchForChainSupplier'
  })
  if (!mallId) return [true, '请选择店铺']
  instance.beforeLoopCallback = async () => {
    return await customIpcRenderer.invoke('db:temu:extCodeSearchForChainSupplier:delete', {
      where: {
        mallId
      }
    })
  }

  const query = {
    pageSize: 100,
    pageNum: 1,
    supplierTodoTypeList: [1]
  }
  instance.requestCallback = async () => {
    const startPageNum = query.pageNum
    const data = await getMoreData()
    const dataList = data?.data?.dataList || []
    const totalTasks = data?.data?.total || 0
    const tasks = dataList.length
    const syncData = dataList.map(item => {
      return {
        mallId,
        json: item
      }
    })
    const response2 = await customIpcRenderer.invoke('db:temu:extCodeSearchForChainSupplier:add', syncData)
    if (response2[0]) return response2
    if (startPageNum == 1) {
      res.customResult = [false, {
        totalTasks,
        requestUuid: instance.uuid,
        completedTasks: tasks
      }]
      next()
    }
    return [false, {
      totalTasks,
      tasks
    }]
  }
  res.customResult = await instance.action()
  next()

  async function getMoreData() {
    if (instance.summary.totalTasks == 0) {
      const response = await getFullSearchForChainSupplierData({
        req,
        query
      })
      query.pageNum++
      return response
    }
    const pArr = []
    const totalTasks = instance.summary.totalTasks
    let completedTasks = instance.summary.completedTasks
    for (let i = 0; i < 5; i++) {
      if (completedTasks >= totalTasks) continue
      const p = getFullSearchForChainSupplierData({
        req,
        query
      })
      query.pageNum++
      completedTasks += query.pageSize
      pArr.push(p)
    }
    const allData = await Promise.all(pArr)
    let response = null
    allData.map(item => {
      if (!response) {
        response = item
        return
      }
      const itemDataList = item?.data?.dataList || []
      if (response?.data?.dataList) response.data.dataList.push(...itemDataList)
    })
    return response
  }
}

async function list(req, res, next) {
  const { body } = req
  let { mallId, page, extCodeLike } = body

  const sql = `SELECT DISTINCT t.* 
FROM extCodeSearchForChainSupplier t,
     json_each(json_extract(t.json, '$.skcList')) AS item
WHERE json_extract(item.value, '$.extCode') like :pattern and t.mallId = :mallId`

  res.customResult = await customIpcRenderer.invoke('db:temu:extCodeSearchForChainSupplier:query', {
    sql,
    page,
    replacements: {
      mallId,
      pattern: extCodeLike ? `%${extCodeLike}%` : '%'
    }
  })
  if (!res.customResult[0]) {
    res.customResult[1] = {
      dataList: res.customResult[1].map(item => {
        return JSON.parse(item.json)
      }),
      total: res.customResult[2]?.page?.total
    }
  }
  next()
}

async function getMinSuggestSupplyPrice(req, res, next) {
  const { body } = req
  let { mallId, extCodeLike } = body

  const sql = `
      SELECT 
        MIN(json_extract(skuInfo.value, '$.suggestSupplyPrice')) AS minSuggestSupplyPrice 
      FROM 
        extCodeSearchForChainSupplier t,
        json_each(json_extract(t.json, '$.skcList')) AS skcItem,
        json_each(json_extract(skcItem.value, '$.supplierPriceReviewInfoList')) AS supplierPriceReviewInfo,
        json_each(json_extract(supplierPriceReviewInfo.value, '$.priceReviewItem.skuInfoList')) AS skuInfo
      WHERE 
        json_extract(skcItem.value, '$.extCode') LIKE :pattern 
        AND t.mallId = :mallId
    `
  res.customResult = await customIpcRenderer.invoke('db:temu:extCodeSearchForChainSupplier:query', {
    sql,
    replacements: {
      mallId,
      pattern: extCodeLike ? `%${extCodeLike}%` : '%'
    }
  })
  next()
}

module.exports = {
  sync,
  list,
  getMinSuggestSupplyPrice
}
