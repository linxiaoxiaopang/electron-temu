const EventEmitter = require('eventemitter3')
const emitter = new EventEmitter()

// 模拟主进程的ipcMain
class CustomIpc {
  constructor() {
    // 存储handle注册的回调函数
    this.handlers = new Map()
  }

  // 模拟ipcMain.handle方法
  handle(channel, callback) {
    // 将回调函数存储到map中，按channel区分
    this.handlers.set(channel, callback)
  }

  // 模拟接收渲染进程的invoke请求（返回Promise）
  invoke(channel, ...args) {
    return new Promise((resolve, reject) => {
      // 查找对应channel的回调函数
      const handler = this.handlers.get(channel)
      if (!handler) {
        reject(new Error(`No handler for channel: ${channel}`))
        return
      }

      try {
        // 执行回调函数
        const result = handler(...args)

        // 处理同步返回值和异步Promise
        if (result instanceof Promise) {
          // 如果是Promise，等待其完成
          result.then(resolve).catch(reject)
        } else {
          // 同步结果直接返回
          resolve(result)
        }
      } catch (error) {
        // 捕获同步错误
        reject(error)
      }
    })
  }
}

// 模拟渲染进程的ipcRenderer
class CustomIpcRenderer {
  constructor(customIpc) {
    this.customIpc = customIpc
  }

  // 模拟ipcRenderer.invoke方法
  invoke(channel, ...args) {
    return this.customIpc.invoke(channel, ...args)
  }
}


const customIpc = new CustomIpc()
const customIpcRenderer = new CustomIpcRenderer(customIpc)

module.exports = {
  customIpc,
  customIpcRenderer,
  emitter
}
