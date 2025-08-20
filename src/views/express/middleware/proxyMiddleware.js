const path = window.require('path')
import store from '@/store'
import service from '@/service/request'

const RESPONSE_LIST = {
  ['/temu-agentseller']: {
    '/api/kiana/gamblers/marketing/enroll/activity/list': getMockPath('activityList.json'),
    '/api/kiana/gamblers/marketing/enroll/scroll/match': getMockPath('activityGoodsInfo.json'),

  },
  ['/temu-seller']: {
    '/bg/quiet/api/mms/userInfo': getMockPath('userInfo.json'),
    '/bg-anniston-mms/category/children/list': getMockPath('categoryChildrenList.json')
  }
}

export default function (option) {
  const { target } = option
  return async function (req, res) {
    const headers = store.state.user.headers
    const { method, url, body, baseUrl } = req
    let mockPath = RESPONSE_LIST[baseUrl][url]
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
    // const wholeUrl = `${target}${url}`
    // const response = await service({
    //   method,
    //   headers,
    //   data: body,
    //   url: wholeUrl
    // })
    // res.json(response.data)
  }
}


function getMockPath(name) {
  return `${path.resolve('src/views/express/mock', name)}`
}
