import { temuTarget } from '@/express/const'
import proxyMiddleware from '@/express/middleware/proxyMiddleware'

export async function getUserInfo(req, res) {
  const getData = proxyMiddleware({
    target: () => {
      return temuTarget
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
