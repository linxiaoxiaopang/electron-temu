const path = window.require('path')
const { merge, map, isFunction, uniq } = require('lodash')
import { isMock, isProxy, headers } from '../const'

const USED_HEADERS_KEYS = ['cookie', 'referer', 'mallid', 'origin', 'content-type']

const defaultHandleReq = (req) => {
  return req
}

export default function (option) {
  return async function (req, res, next = () => {
  }) {
    let { target, handleReq = defaultHandleReq, isReturnData } = option
    if (res?.noUseProxy) return next()
    if (isFunction(target)) {
      target = target()
    }
    const { url, baseUrl } = handleReq(req)
    const allConfig = await getConfig()
    const config = allConfig[baseUrl][url] || {}
    const { onBeforeSend } = config
    if (onBeforeSend) await onBeforeSend({ req, res })
    const response = isMock ? await getMockData() : await getTemuData()
    if (isReturnData) return response[1]
    res.customResult = response
    next()

    async function getMockData() {
      let { path: mockPath } = config
      if (!mockPath) return [true, '数据不存在']
      mockPath = mockPath.replace(/\+/g, '/')
      const data = window.require(mockPath)
      return [false, data?.result]
    }

    async function getTemuData() {
      const wholeUrl = `${target}${url}`
      const data = await createProxyToGetTemuData(req, res)(wholeUrl)
      return [false, data?.result || data?.data]
    }
  }
}

async function getConfig() {
  const { path: appPath } = await window.ipcRenderer.invoke('getAppInfo')
  return {
    ['/temu-agentseller']: {
      '/api/seller/auth/userInfo': {
        path: getMockPath('userInfo.json')
      },
      '/api/kiana/gamblers/marketing/enroll/activity/list': {
        path: getMockPath('activityList.json')
      },
      '/api/kiana/gamblers/marketing/enroll/scroll/match': {
        path: getMockPath('activityGoodsInfo.json')
      },
      '/bg-anniston-mms/category/children/list': {
        path: getMockPath('categoryChildrenList.json')
      },
      '/api/kiana/mms/robin/searchForSemiSupplier': {
        path: getMockPath('searchForChainSupplier.json')
      }
    }
  }

  function getMockPath(name) {
    return `${path.join(appPath, 'mock', name)}`
  }
}

export function createProxyToGetTemuData(req) {
  return async function (wholeUrl, mergeConfig = {}) {
    const { method, body } = req
    const formatHeaderKeys = Object.keys(headers || {}).filter(key => {
      const lowerCaseKey = key.toLowerCase()
      return USED_HEADERS_KEYS.includes(lowerCaseKey)
    })
    const usedHeaders = formatHeaderKeys.reduce((acc, key) => {
      if (headers[key]) acc[key] = headers[key]
      return acc
    }, {})
    const { mallId, page, ...restBody } = body
    let finalPage = {}
    if (page) {
      finalPage.pageNum = page.pageIndex
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
    const response = await window.ipcRenderer.invoke('proxyRequest', merge(defaultConfig, mergeConfig))
    if (isProxy) response.result = response.data
    if (page) {
      response.page = {
        ...page,
        total: (response.result || response.data)?.total
      }
    }
    return response
  }
}
