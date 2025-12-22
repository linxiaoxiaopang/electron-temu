const { merge, isFunction, cloneDeep } = require('lodash')
const { getIsProxy, getHeaders } = require('~store/user')
const { customIpcRenderer } = require('~/utils/event')
const USED_HEADERS_KEYS = ['cookie', 'referer', 'mallid', 'origin', 'content-type']

const defaultHandleReq = (req) => {
  return req
}

function createProxyMiddleware(option) {
  return async function (req, res, next = () => {
  }) {
    let { target, handleReq = defaultHandleReq, isReturnData } = option
    if (res?.noUseProxy) return next()
    if (isFunction(target)) {
      target = target()
    }
    const { url } = handleReq(req)
    const response = await getTemuData()
    if (isReturnData) return response[1]
    res.customResult = response
    next()


    async function getTemuData() {
      const wholeUrl = `${target}${url}`
      const data = await createProxyToGetTemuData(req, res)(wholeUrl)
      return [false, data?.result || data?.data]
    }
  }
}

function createProxyToGetTemuData(req) {
  return async function (wholeUrl, mergeConfig = {}) {
    let { method, body, customOrigin } = req
    method = method || 'POST'
    let { mallId, page, ...restBody } = body
    mergeConfig = cloneDeep(mergeConfig)
    const isProxy = getIsProxy()
    const usedHeaders = getUsedHeaders(mallId, customOrigin)
    const mergePage = mergeConfig?.data?.page
    if (mergePage) {
      delete mergeConfig.data.page
      page = merge({}, page, mergePage)
    }
    let finalPage = {}
    if (page) {
      finalPage.page = page.pageIndex
      finalPage.pageNum = page.pageIndex
      finalPage.pageNo = page.pageIndex
      finalPage.pageSize = page.pageSize
    }
    const defaultConfig = {
      method,
      headers: {
        ...usedHeaders
      },
      data: {
        ...restBody,
        ...finalPage
      },
      url: wholeUrl
    }
    if (isProxy) {
      defaultConfig.data.mallId = mallId
    } else {
      defaultConfig.headers.mallid = mallId
    }
    let response = await customIpcRenderer.invoke('proxyRequest', merge(defaultConfig, mergeConfig))
    if (isProxy) response.result = response.data
    if (!response.result && !response.data) {
      const rawResponse = response
      response = {}
      response.result = response.data = rawResponse
    }
    if (page) {
      response.page = {
        ...page,
        total: (response.result || response.data)?.total
      }
    }
    return response
  }
}

function getUsedHeaders(mallId, origin) {
  const headers = getHeaders(mallId, origin)
  const formatHeaderKeys = Object.keys(headers || {}).filter(key => {
    const lowerCaseKey = key.toLowerCase()
    return USED_HEADERS_KEYS.includes(lowerCaseKey)
  })
  const usedHeaders = formatHeaderKeys.reduce((acc, key) => {
    if (headers[key]) acc[key] = headers[key]
    return acc
  }, {})
  usedHeaders.mallid = mallId
  return usedHeaders
}

module.exports = {
  getUsedHeaders,
  createProxyMiddleware,
  createProxyToGetTemuData
}
