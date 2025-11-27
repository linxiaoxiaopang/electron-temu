const URL = require('url')
const { uniq, cloneDeep } = require('lodash')
const { getUserInfo } = require('~express/controllers/user')
const { emitter } = require('~utils/event')
const { default: getPort } = require('get-port')

const user = {
  apiMode: 'temu',
  mallList: {},
  port: ''
}

exports.MALL_SOLE = {
  semiSole: 1,
  fullSole: 0
}


exports.getApiMode = function () {
  return user.apiMode
}

exports.getIsProxy = function () {
  return exports.getApiMode() === 'proxy'
}

exports.getMall = function (mallId) {
  const { mallList } = user
  for (let key in mallList) {
    const item = mallList[key]
    if (!item.list[mallId]) continue
    return item.list[mallId]
  }
  return null
}

exports.getHeaders = function (mallId) {
  const mall = exports.getMall(mallId)
  if (!mall) return null
  return mall.headers
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

exports.getWholeUrl = function (relativeUrl) {
  return `${exports.getTemuTarget()}${relativeUrl}`
}


let p = null //promise
exports.getPort = async function () {
  const { default: getPort } = require('get-port')
  if (p) return await p
  p = getPort({ port: 3000 })
  user.port = await p
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
  let { Origin: origin, Referer: referer } = headers
  if (!origin && referer) {
    const { host, protocol } = URL.parse(referer)
    headers.Origin = `${protocol}//${host}`
    origin = headers.Origin
  }
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
  data?.mallList?.map(item => {
    const { mallId } = item
    const cloneHeader = cloneDeep(headers)
    cloneHeader.mallid = mallId
    sameOriginMallList[mallId] = {
      mallId,
      origin,
      headers: cloneHeader,
      userInfo: data
    }
  })
}
