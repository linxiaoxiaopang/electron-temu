const { ipcRenderer, contextBridge } = require('electron')
// 直接挂载到 window 上（上下文未隔离，渲染进程可直接访问）

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (event, ...args) => ipcRenderer.invoke(event, ...args)
})
