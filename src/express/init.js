const express = window.require('express')
const bodyParser = window.require('body-parser')
const cors = window.require('cors')
const { groupBy, map } = require('lodash')
import store from '@/store'
import proxyMiddleware, { createProxyToGetTemuData } from './middleware/proxyMiddleware'
import validHeadersMiddleware from './middleware/validHeadersMiddleware'
import { isMock, temuTarget } from './const'

const PORT = 3000

const app = express()
// 使用cors中间件，允许所有来源的请求
app.use(cors())
app.use(bodyParser.json({ limit: '50mb' })) // 设置为 50mb
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))

app.post('/setHeaders', async (req, res) => {
  const { headers } = req.body
  store.commit('user/SET_HEADERS', headers)
  res.json({
    code: 0,
    data: 0
  })
})

app.use(/^\/?(temu-agentseller|temu-seller)/, validHeadersMiddleware)

app.post('/temu-agentseller/api/kiana/gamblers/marketing/enroll/scroll/match', async (req, res, next) => {
  if (isMock) return next()
  const { body } = req
  const relativeUrl = req.originalUrl.replace(/^\/temu-agentseller/, '')
  const wholeUrl = `${temuTarget}${relativeUrl}`
  const getData = createProxyToGetTemuData(req)
  let response = {
    hasMore: false,
    matchList: []
  }
  let err = null
  const matchList = response.matchList
  const { mallId, ...restBody } = body
  do {
    const data = await getData(wholeUrl, { data: restBody })
    const result = data?.result
    if (!result) err = true
    response.hasMore = result?.hasMore
    matchList.push(...(result?.matchList || []))
    restBody.searchScrollContext = result?.searchScrollContext
  } while (response?.hasMore)
  res.json({
    code: 0,
    data: response,
    message: err ? '数据请求失败' : ''
  })
})

app.post('/temu-agentseller/api/verifyPrice/updateCreatePricingStrategy', async (req, res, next) => {
  const { body } = req
  const relativeUrl = '/api/kiana/magnus/mms/price/bargain-no-bom/batch'
  const wholeUrl = `${temuTarget}${relativeUrl}`
  const getData = createProxyToGetTemuData(req)
  const strategyList = body?.strategyList || []
  const filter = {
    ['op:or']: strategyList.map(item => {
      return {
        ['op:and']: [
          {
            ['json:json.skuId']: item.skuId
          },
          {
            ['json:json.priceOrderId']: item.priceOrderId
          }]
      }
    })
  }
  const [err, dbRes] = await window.ipcRenderer.invoke('db:temu:updateCreatePricingStrategy:find', {
    where: filter
  })
  if (err) {
    return {
      code: 0,
      data: null,
      message: dbRes
    }
  }
  const [err1, dbRes1] = await window.ipcRenderer.invoke('db:temu:updateCreatePricingStrategy:delete', {
    where: {
      id: {
        ['op:in']: map(dbRes, 'id')
      }
    }
  })
  if (err1) {
    return {
      code: 0,
      data: null,
      message: dbRes1
    }
  }
  await window.ipcRenderer.invoke('db:temu:updateCreatePricingStrategy:add', strategyList.map(item => {
    return { json: item }
  }))
  if (isMock) {
    return {
      code: 0,
      data: null,
      message: ''
    }
  }
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
  const response = await getData(wholeUrl)
  res.json({
    code: 0,
    data: response,
    message: ''
  })
})

app.use('/temu-agentseller', proxyMiddleware({
  target: () => {
    return temuTarget
  }
}))

// 处理 404 错误
app.use((err, req, res, next) => {
  res.status(404).json({
    code: 404,
    data: err?.message || err,
    message: err?.message || err
  })
})

// 处理 500 错误
app.use((err, req, res, next) => {
  res.status(500).json({
    code: 500,
    data: err?.message || err,
    message: err?.message || err
  })
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`)
})
