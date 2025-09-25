async function getUserInfo(req, res) {
  const { getTemuTarget } = require('~store/user')
  const { createProxyMiddleware } = require('../middleware/proxyMiddleware')
  const getData = createProxyMiddleware({
    target: () => {
      return getTemuTarget()
    },
    handleReq: (req) => {
      return {
        ...req,
        url: '/api/seller/auth/userInfo',
        baseUrl: '/temu-agentseller',
        body: {}
      }
    },
    isReturnData: true
  })
  return await getData(req, res)
}

module.exports = {
  getUserInfo
}
