const express = window.require('express')
const bodyParser = window.require('body-parser')
const cors = window.require('cors')
import store from '@/store'
import proxyMiddleware from './middleware/proxyMiddleware'
import validHeadersMiddleware from './middleware/validHeadersMiddleware'

const PORT = 3000
let app = null

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

  app.use('/temu-agentseller', proxyMiddleware({
    target: 'https://agentseller.temu.com'
  }))

// 处理 404 错误
  app.use((req, res, next) => {
    res.status(404).send('<h1>404 Not Found</h1>')
  })

// 处理 500 错误
  app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).send('<h1>500 Internal Server Error</h1>')
  })

// 启动服务器
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`)
  })
}
