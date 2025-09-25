const { chunk, isArray } = require('lodash')
const { customIpcRenderer } = require('~/utils/event')

async function ipcRendererInvoke(opName, ...args) {
  return await customIpcRenderer.invoke(opName, ...args)
}

async function ipcRendererInvokeAdd(opName, data, option) {
  const chunkCount = option?.chunkCount || 500
  if (!isArray(data)) data = [data]
  const allRes = [false, 0]
  for (const chunkData of chunk(data, chunkCount)) {
    const response = await ipcRendererInvoke(opName, chunkData)
    if (response[0]) return response
    if (isArray(response[1])) {
      allRes[1] += response[1].length
    } else {
      allRes[1] += response[1]
    }
  }
  return allRes
}

module.exports = {
  ipcRendererInvokeAdd
}
