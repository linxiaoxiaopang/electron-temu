const { getTemuTarget } = require('~store/user')
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

async function getData(
  {
    req,
    query,
    relativeUrl
  }
) {
  const wholeUrl = `${getTemuTarget()}${relativeUrl}`
  const getData = createProxyToGetTemuData(req)
  return await getData(wholeUrl, { data: query })
}

module.exports = {
  createApiFactory,
  getData
}
