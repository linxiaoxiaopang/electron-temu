import { temuTarget } from '@/express/const'
import { createProxyToGetTemuData } from '@/express/middleware/proxyMiddleware'

export async function getUserInfo() {
  const relativeUrl = '/api/seller/auth/userInfo'
  const wholeUrl = `${temuTarget}${relativeUrl}`
  const getData = createProxyToGetTemuData({
    method: 'POST',
    body: {}
  })
  return await getData(wholeUrl)
}
