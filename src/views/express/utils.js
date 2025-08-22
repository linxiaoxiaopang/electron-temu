import { next } from 'lodash/seq'

const express = window.require('express')
const bodyParser = window.require('body-parser')
const cors = window.require('cors')
import store from '@/store'
import proxyMiddleware, { createProxyToGetTemuData } from './middleware/proxyMiddleware'
import validHeadersMiddleware from './middleware/validHeadersMiddleware'

const PORT = 3000
let app = null
const TEMU_TARGET = 'https://agentseller.temu.com'

export function createExpressApp() {
  if (app) return app
  app = express()
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
    const apiMode = store.state.user.apiMode
    const isMock = apiMode === 'mock'
    if (isMock) return next()
    const { body } = req
    const relativeUrl = req.originalUrl.replace(/^\/temu-agentseller/, '')
    const wholeUrl = `${TEMU_TARGET}${relativeUrl}`
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

  app.use('/temu-agentseller', proxyMiddleware({
    target: TEMU_TARGET
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
}
