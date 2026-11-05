const { ipcRenderer, contextBridge } = require('electron')
// 直接挂载到 window 上（上下文未隔离，渲染进程可直接访问）

// 记录已注册的监听，便于渲染进程按 channel 取消订阅
const listenerMap = new Map()

function addListener(channel, callback) {
  const listener = (event, ...args) => callback(...args)
  ipcRenderer.on(channel, listener)
  const listeners = listenerMap.get(channel) || []
  listeners.push({ callback, listener })
  listenerMap.set(channel, listeners)
}

function removeListener(channel, callback) {
  const listeners = listenerMap.get(channel) || []
  const remaining = []

  listeners.forEach(item => {
    // 未指定 callback 时移除该 channel 的全部监听
    if (callback && item.callback !== callback) {
      remaining.push(item)
      return
    }
    ipcRenderer.removeListener(channel, item.listener)
  })

  if (remaining.length > 0) {
    listenerMap.set(channel, remaining)
  } else {
    listenerMap.delete(channel)
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (event, ...args) => ipcRenderer.invoke(event, ...args),
  on: (channel, callback) => {
    if (typeof callback !== 'function') return
    addListener(channel, callback)
  },
  off: (channel, callback) => {
    removeListener(channel, callback)
  }
})
