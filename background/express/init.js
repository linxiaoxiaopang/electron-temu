const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const { emitter } = require('~/utils/event')
const { createProxyMiddleware, createProxyToGetTemuData } = require('./middleware/proxyMiddleware')
const responseMiddleware = require('./middleware/responseMiddleware')
const errorMiddleware = require('./middleware/errorMiddleware')
const validHeadersMiddleware = require('./middleware/validHeadersMiddleware')
const { getTemuTarget, getPort } = require('~store/user')
const mallRouter = require('./api/mall')
const batchReportingActivities = require('./api/batchReportingActivities')
const verifyPriceRouter = require('./api/verifyPrice')

const app = express()
// 使用cors中间件，允许所有来源的请求
app.use(cors())
app.use(bodyParser.json({ limit: '50mb' })) // 设置为 50mb
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))


app.use('/temu-agentseller', validHeadersMiddleware)

app.post('/setHeaders', async (req, res, next) => {
  const { headers } = req.body
  emitter.emit('getRequestHeaders', headers)
  res.customResult = [false, true]
  next()
})

app.post('/temu-agentseller/api/kiana/gamblers/marketing/enroll/scroll/match', async (req, res, next) => {
  const { body } = req
  const relativeUrl = req.originalUrl.replace(/^\/temu-agentseller/, '')
  const wholeUrl = `${getTemuTarget()}${relativeUrl}`
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
  res.noUseProxy = true
  res.customResult = [err, response]
  next()
})


app.use('/temu-agentseller/api/mall', mallRouter)
app.use('/temu-agentseller/api/batchReportingActivities', batchReportingActivities)
app.use('/temu-agentseller/api/verifyPrice', verifyPriceRouter)

app.use('/temu-agentseller', createProxyMiddleware({
  target: () => {
    return getTemuTarget()
  }
}))

app.use(responseMiddleware)
app.use(errorMiddleware)

getPort().then(port => {
  // 启动服务器
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`)
  })
})

