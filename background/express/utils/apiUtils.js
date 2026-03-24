const axios = require('axios')
const { getTemuTarget, getPort } = require('~store/user')
const { createProxyToGetTemuData } = require('~express/middleware/proxyMiddleware')

function createApiFactory(router) {
  return function (apiList, namespace = '') {
    if (!apiList) return
    Object.keys(apiList).map(path => {
      const fn = apiList[path]
      if (namespace) {
        path = `/${namespace}/${path}`
      } else {
        path = `/${path}`
      }
      router.post(path, fn)
    })
  }
}

async function proxyRequest(
  {
    req,
    query,
    relativeUrl,
    target = 'default'
  }
) {
  const wholeUrl = `${getTemuTarget(target)}${relativeUrl}`
  const getData = createProxyToGetTemuData(req)
  return await getData(wholeUrl, { data: query })
}

// 1. 封装本地请求工具（自动补全域名，使用相对路径）
const localRequest = async (relativePath, options = {}) => {
  // 补全本地域名+端口，relativePath为相对路径（如/api/user/1001）
  const port = await getPort()
  const baseUrl = `http://localhost:${port}`
  const url = new URL(relativePath, baseUrl).href

  const response = await axios({
    url,
    method: options.method || 'POST',
    data: options.data,
    params: options.params
  })
  return response?.data
}

module.exports = {
  createApiFactory,
  proxyRequest,
  localRequest
}
