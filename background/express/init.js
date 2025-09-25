const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const { createProxyMiddleware, createProxyToGetTemuData } = require('./middleware/proxyMiddleware')
const responseMiddleware = require('./middleware/responseMiddleware')
const errorMiddleware = require('./middleware/errorMiddleware')
const validHeadersMiddleware = require('./middleware/validHeadersMiddleware')
const { getTemuTarget } = require('./const')
const verifyPriceRouter = require('./api/verifyPrice')


const PORT = 3000

const app = express()
// 使用cors中间件，允许所有来源的请求
app.use(cors())
app.use(bodyParser.json({ limit: '50mb' })) // 设置为 50mb
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))


app.use('/temu-agentseller', validHeadersMiddleware)

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


app.use('/temu-agentseller/api/verifyPrice', verifyPriceRouter)

app.use('/temu-agentseller', createProxyMiddleware({
  target: () => {
    return getTemuTarget()
  }
}))

app.use(responseMiddleware)
app.use(errorMiddleware)

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`)
})
