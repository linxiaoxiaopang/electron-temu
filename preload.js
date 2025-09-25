const { ipcRenderer } = require('electron')
// 直接挂载到 window 上（上下文未隔离，渲染进程可直接访问）
window.ipcRenderer = ipcRenderer
