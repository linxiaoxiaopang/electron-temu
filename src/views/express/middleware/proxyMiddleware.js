const path = window.require('path')
const { merge } = require('lodash')

import store from '@/store'

const USED_HEADERS_KEYS = ['cookie', 'referer', 'mallid', 'origin', 'content-type']

export default function (option) {
  const { target } = option
  return async function (req, res) {
    const apiMode = store.state.user.apiMode
    const { url, baseUrl, body } = req
    const isMock = apiMode === 'mock'
    if (isMock) return await getMockData()
    return getTemuData()

    async function getMockData() {
      const responseList = await getResponseList()
      let { path: mockPath, handleResult } = responseList[baseUrl][url]
      if (!mockPath) {
        res.json({
          code: 0,
          data: null,
          message: '数据不存在'
        })
        return
      }
      mockPath = mockPath.replace(/\+/g, '/')
      const data = window.require(mockPath)
      await window.ipcRenderer.invoke('db:temu:batchReportingActivities:clear')
      await window.ipcRenderer.invoke('db:temu:batchReportingActivities:add', handleResult(data).map(item => {
        return { json: item }
      }))
      const filter = body?.filter || {}
      const json = filter?.json || {}
      const jsonKeys = Object.keys(json)
      const jsonQuery = jsonKeys.map(key => {
        return {
          [`json:json.${key}`]: filter[key]
        }
      })
      const [dbErr, dbRes] = await window.ipcRenderer.invoke('db:temu:batchReportingActivities:find', {
        where: {
          ['op:and']: jsonQuery
        },
        page: filter?.page || {}
      })
      if (!dbErr) {
        data.result.activityList = dbRes.map(item => {
          return item.dataValues.json
        })
      }
      res.json({
        code: 0,
        data: data.result,
        message: ''
      })
    }

    async function getTemuData() {
      const wholeUrl = `${target}${url}`
      const data = await createProxyToGetTemuData(req, res)(wholeUrl)
      res.json({
        code: 0,
        data: data?.result,
        message: ''
      })
    }
  }
}


async function getResponseList() {
  const { path: appPath } = await window.ipcRenderer.invoke('getAppInfo')
  return {
    ['/temu-agentseller']: {
      '/api/seller/auth/userInfo': {
        path: getMockPath('userInfo.json')
      },
      '/api/kiana/gamblers/marketing/enroll/activity/list': {
        path: getMockPath('activityList.json'),
        handleResult(res) {
          return res?.result?.activityList || []
        }
      },
      '/api/kiana/gamblers/marketing/enroll/scroll/match': {
        path: getMockPath('activityGoodsInfo.json')
      },
      '/bg-anniston-mms/category/children/list': {
        path: getMockPath('categoryChildrenList.json')
      }
    }
  }

  function getMockPath(name) {
    return `${path.join(appPath, 'mock', name)}`
  }
}

export function createProxyToGetTemuData(req) {
  return async function (wholeUrl, mergeConfig = {}) {
    const headers = store.state.user.headers
    const { method, body } = req
    const formatHeaderKeys = Object.keys(headers).filter(key => {
      const lowerCaseKey = key.toLowerCase()
      return USED_HEADERS_KEYS.includes(lowerCaseKey)
    })
    const usedHeaders = formatHeaderKeys.reduce((acc, key) => {
      if (headers[key]) acc[key] = headers[key]
      return acc
    }, {})
    const { mallId, ...restBody } = body
    const defaultConfig = {
      method,
      headers: {
        ...usedHeaders,
        mallid: mallId
      },
      data: restBody,
      url: wholeUrl
    }
    const response = await window.ipcRenderer.invoke('proxyRequest', merge(defaultConfig, mergeConfig))
    return response
  }
}
