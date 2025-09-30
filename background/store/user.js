const { uniq } = require('lodash')
const { getUserInfo } = require('~express/controllers/user')
const { emitter } = require('~utils/event')

const user = {
  apiMode: 'temu',
  mallList: {},
  port: ''
}

exports.getApiMode = function () {
  return user.apiMode
}

exports.getIsProxy = function () {
  return exports.getApiMode() === 'proxy'
}

exports.getHeaders = function (mallId) {
  const { mallList } = user
  for (let key in mallList) {
    const item = mallList[key]
    if (!item.list[mallId]) continue
    return item.list[mallId]?.headers
  }
  return null
}

exports.getMallIds = function () {
  const { mallList } = user
  const tmpData = []
  Object.values(mallList).map(item => {
    Object.values(item.list).map(sItem => {
      tmpData.push(sItem.mallId)
    })
  })
  return uniq(tmpData)
}

exports.getTemuTarget = function () {
  return exports.getIsProxy() ? 'http://192.168.10.81:3000/temu-agentseller' : 'https://agentseller.temu.com'
}

exports.getPort = async function () {
  const { default: getPort } = require('get-port')
  user.port = await getPort({ port: 3000 })
  return user.port
}

exports.user = user


emitter.on('getRequestHeaders', async (headers) => {
  await updateUserInfo(headers)
})

loopGetUserInfo()

async function loopGetUserInfo() {
  setTimeout(async () => {
    const { mallList } = user
    for (let key in mallList) {
      const item = mallList
      let { userInfo, headers } = item
      if (!userInfo) continue
      await updateUserInfo(headers)
    }
    return loopGetUserInfo()
  }, 3000)
}

let lastPromiseList = {}

async function updateUserInfo(headers) {
  if (!headers) return
  const { Origin: origin } = headers
  const key = origin
  if (!lastPromiseList[key]) lastPromiseList[key] = {}
  const item = lastPromiseList[key]
  const p = item.lastPromise = getUserInfo(headers)
  const data = await p
  if (item.lastPromise !== p) return
  if (!user.mallList[key]) user.mallList[key] = {}
  const sameOriginMall = user.mallList[key]
  if (!sameOriginMall.list) {
    sameOriginMall.list = {}
  }
  if (!data) return
  const sameOriginMallList = sameOriginMall.list
  const mallId = headers.mallid = data?.mallList?.[0]?.mallId
  sameOriginMallList[mallId] = {
    mallId,
    headers,
    origin,
    userInfo: data
  }
}
