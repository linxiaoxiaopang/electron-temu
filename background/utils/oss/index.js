const OSS = require('ali-oss')
const axios = require('axios')
const { ossOption } = require('./const')
const client = new OSS(ossOption)

async function uploadToOssUseUrl(url) {
  const responseStream  = await analysisFileByAxios(url, { passFileReader: true })
  const fileName = getFillFileName(url)
  const randomFileName = getRandom() + fileName
  const options = {}
  const result = await client.put(randomFileName, responseStream, options)
  console.log('result', result)
  return result
}


function getRandom() {
  return Math.random().toString(36).substr(2) + Date.now()
}

function getFileName(path = '') {
  path = (path || '').split('?')[0]
  const pointLastIndex = path.lastIndexOf('.')
  const chaLastIndex = path.lastIndexOf('/')
  return path.slice(chaLastIndex + 1, pointLastIndex)
}

function getFileSuffix(path = '') {
  path = path || ''
  const chaLastIndex = path.lastIndexOf('.')
  const name = path.slice(chaLastIndex + 1)
  return name.split('?')[0]
}

function getFillFileName(path = '') {
  return `${getFileName(path)}.${getFileSuffix(path)}`
}

function analysisFileByAxios(url, config = {}) {
  if (!config.responseType) {
    config.responseType = 'stream'
  }
  //fileReader 的方法
  if (!config.fileReaderFuncName) {
    config.fileReaderFuncName = 'readAsDataURL'
  }
  const { fileReaderFuncName, ...restConfig } = config
  return axios
    .get(url, {
      ...restConfig
    })
    .then((res) => {
      const { status, data } = res || {}
      if (status >= 200 && status < 300) {
        if (config.passFileReader) {
          return data
        }
        const fileReader = new FileReader()
        const p = new Promise((resolve, reject) => {
          fileReader.onloadend = function (e) {
            resolve(e.target.result)
          }
        })
        fileReader[fileReaderFuncName](data)
        return p
      }
    })
    .catch((err) => {
      throw err
    })
}

module.exports = {
  uploadToOssUseUrl
}
