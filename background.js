const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron')
const path = require('path')
if (require('electron-squirrel-startup')) {
  app.quit() // 若为安装/更新相关启动，则自动退出
}
let tray = null
let mainWindow = null
const isDev = process.env.NODE_ENV === 'development'
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,        // 允许渲染进程使用 Node.js API
      contextIsolation: false,    // 关闭上下文隔离（Vue 2 通常需要此设置）
      preload: path.join(__dirname, 'preload.js')
    }
  })
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080')
    mainWindow.webContents.openDevTools()
    const chokidar = require('chokidar')
    // 监听渲染进程文件变化，自动刷新
    const watcher = chokidar.watch(path.join(__dirname, '../src'), {
      ignoreInitial: true
    })

    watcher.on('change', (path) => {
      console.log(`文件变化: ${path}，自动刷新...`)
      mainWindow.reload()
    })
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'))
  }
  // 关闭窗口时默认最小化到托盘
  mainWindow.on('close', (event) => {
    // 只有明确退出时才真正关闭
    if (!app.isQuiting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

// 监听渲染进程请求，返回 app 信息
ipcMain.handle('getAppInfo', () => {
  return {
    path: app.getAppPath(),
    version: app.getVersion()
  }
})

app.whenReady().then(() => {
  createWindow()
  if (!isDev) {
    createTray()
  }
})


// 创建托盘图标
function createTray() {
  // 托盘图标路径（建议准备不同尺寸图标适配各种系统）
  const iconPath = path.join(__dirname, 'public/favicon.ico')

  tray = new Tray(iconPath)

  // 托盘悬停文本
  tray.setToolTip('我的 Electron 应用')

  // 托盘右键菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow.show()
      }
    },
    {
      label: '退出',
      click: () => {
        app.isQuiting = true
        app.quit()
      }
    }
  ])

  // 设置托盘菜单
  tray.setContextMenu(contextMenu)

  // 单击托盘图标显示/隐藏窗口
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  })
}

