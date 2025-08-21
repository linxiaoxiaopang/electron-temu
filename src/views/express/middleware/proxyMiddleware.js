const path = window.require('path')

import store from '@/store'
import service from '@/service/request'

const USED_HEADERS_KEYS = ['cookie', 'referer', 'mallid', 'origin', 'content-type']

export default function (option) {
  const { target } = option
  return async function (req, res) {
    const headers = store.state.user.headers
    const { method, url, body, baseUrl } = req
    const isMock = false
    if (isMock) return await getMockData()
    return getTemuData()

    async function getMockData() {
      const responseList = await getResponseList()
      let mockPath = responseList[baseUrl][url]
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

      res.json({
        code: 0,
        data: data.result,
        message: ''
      })
    }

    async function getTemuData() {
      const usedHeaders = USED_HEADERS_KEYS.reduce((acc, key) => {
        if (headers[key]) acc[key] = headers[key]
        return acc
      }, {})
      const wholeUrl = `${target}${url}`
      const { mallId, ...restBody } = body
      const response = await service({
        method,
        headers: {
          ...usedHeaders,
          mallId
        },
        data: restBody,
        url: wholeUrl
      })
      const data = response.data
      res.json({
        code: 0,
        data: data.result,
        message: ''
      })
    }
  }
}


async function getResponseList() {
  const { path: appPath } = await window.ipcRenderer.invoke('getAppInfo')
  return {
    ['/temu-agentseller']: {
      '/api/seller/auth/userInfo': getMockPath('userInfo.json'),
      '/api/kiana/gamblers/marketing/enroll/activity/list': getMockPath('activityList.json'),
      '/api/kiana/gamblers/marketing/enroll/scroll/match': getMockPath('activityGoodsInfo.json'),
      '/bg-anniston-mms/category/children/list': getMockPath('categoryChildrenList.json')
    }
  }

  function getMockPath(name) {
    return `${path.join(appPath, 'mock', name)}`
  }
}


