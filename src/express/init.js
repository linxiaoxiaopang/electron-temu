const express = window.require('express')
const bodyParser = window.require('body-parser')
const cors = window.require('cors')
import store from '@/store'
import proxyMiddleware, { createProxyToGetTemuData } from './middleware/proxyMiddleware'
import validHeadersMiddleware from './middleware/validHeadersMiddleware'
import { isMock, temuTarget } from './const'
import { updateCreatePricingStrategy } from '@/express/controllers/verifyPrice'
import { getUserInfo } from '@/express/controllers/user'

const PORT = 3000

const app = express()
// 使用cors中间件，允许所有来源的请求
app.use(cors())
app.use(bodyParser.json({ limit: '50mb' })) // 设置为 50mb
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))

app.post('/setHeaders', async (req, res) => {
  const { headers } = req.body
  let result = null
  if (headers) result = await getUserInfo()
  store.dispatch('user/SetUserInfo', {
    headers,
    userInfo: result
  })
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
  const [err, response] = await updateCreatePricingStrategy(req)
  res.json({
    code: 0,
    data: err ? null : response,
    message: err ? response : ''
  })
})

app.post('/temu-agentseller/api/verifyPrice/getPricingStrategy', async (req, res) => {
  const { body } = req
  const skuIdList = body?.skuIdList || []
  const [err, response] = await window.ipcRenderer.invoke('db:temu:pricingStrategy:find', {
    where: {
      skuId: {
        'op:in': skuIdList
      }
    }
  })
  return res.json({
    code: 0,
    data: err ? null : response,
    message: err ? response : ''
  })
})

app.post('/temu-agentseller/api/verifyPrice/updateCreatePricingStrategy', async (req, res, next) => {
  const [err, response] = await updateCreatePricingStrategy(req)
  res.json({
    code: 0,
    data: err ? null : response,
    message: err ? response : ''
  })
})

app.post('/temu-agentseller/api/verifyPrice/setPricingConfigAndStartPricing', async (req, res, next) => {
  const { body } = req
  const [err, response] = await window.ipcRenderer.invoke('db:temu:pricingConfig:update', 1, body)
  return res.json({
    code: 0,
    data: err ? null : response,
    message: err ? response : ''
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
