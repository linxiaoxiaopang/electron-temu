const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const { emitter } = require('~/utils/event')
const { createProxyMiddleware, createProxyToGetTemuData } = require('./middleware/proxyMiddleware')
const responseMiddleware = require('./middleware/responseMiddleware')
const errorMiddleware = require('./middleware/errorMiddleware')
const validHeadersMiddleware = require('./middleware/validHeadersMiddleware')
const mergeDataMiddleware = require('./middleware/mergeDataMiddleware')
const { getTemuTarget, getPort } = require('~store/user')
const mallRouter = require('./api/mall')
const userRouter = require('./api/user')
const batchReportingActivitiesRouter  = require('./api/batchReportingActivities')
const goodsRouter = require('./api/goods')
const verifyPriceRouter = require('./api/verifyPrice')
const app = express()
// 使用cors中间件，允许所有来源的请求
app.use(cors())
app.use(bodyParser.json({ limit: '50mb' })) // 设置为 50mb
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))


app.use('/temu-agentseller', validHeadersMiddleware)
app.use('/temu-agentseller', mergeDataMiddleware)

app.post('/setHeaders', async (req, res, next) => {
  const { headers } = req.body
  emitter.emit('getRequestHeaders', headers)
  res.customResult = [false, true]
  next()
})



app.use('/temu-agentseller/api/mall', mallRouter)
app.use('/temu-agentseller/api/user', userRouter)
app.use('/temu-agentseller/api/batchReportingActivities', batchReportingActivitiesRouter)
app.use('/temu-agentseller/api/goods',goodsRouter)
app.use('/temu-agentseller/api/verifyPrice', verifyPriceRouter)

app.use('/temu-agentseller/proxy', createProxyMiddleware({
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

