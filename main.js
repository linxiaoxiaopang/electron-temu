require('module-alias/register')
require('~/store')
require('~/model')
require('~/express/init')
require('~/express/timer/verifyPrice')
const { emitter } = require('~/utils/event')
const { customIpc } = require('~/utils/event')
const { app, BrowserWindow, Tray, Menu, ipcMain, session, MenuItem } = require('electron')
const path = require('path')
const axios = require('axios')
app.commandLine.appendSwitch('disable-content-security-policy')
app.commandLine.appendSwitch('disable-web-security')
if (require('electron-squirrel-startup')) {
  app.quit() // 若为安装/更新相关启动，则自动退出
}
let tray = null
let mainWindow = null
const isDev = process.env.NODE_ENV === 'development'
const indexPath = isDev ? 'http://localhost:8080' : 'dist/index.html'

customIpc.handle('proxyRequest', async (config = {}) => {
  try {
    // 主进程中可自由设置 Cookie 头
    const response = await axios(config)
    if (response?.data?.result) {
      response.data.data = response?.data?.result
    }
    return response?.data
  } catch (error) {
    return { error: error.message }
  }
})

ipcMain.handle('openNewWindow', (event, url) => {
  loadUrl(url)
})

app.whenReady().then(() => {
  watchPage()
  initWindow()
  createMenu()
  if (!isDev) {
    createTray()
  }
})

function loadUrl(url) {
  if (url.startsWith('http')) return mainWindow.loadURL(url)
  mainWindow.loadFile(path.join(__dirname, url))
}

// 创建菜单栏
function createMenu() {
  const menu = new Menu()

  // 首页 菜单
  menu.append(new MenuItem({
    label: '首页',
    click: () => {
      loadUrl(indexPath)
    }
  }))

  menu.append(new MenuItem({
    label: 'temu工具',
    click: () => {
      loadUrl('https://toolbox.zdcustom.com/#/')
    }
  }))

  menu.append(new MenuItem({
    label: 'kuajingmaihuo',
    click: () => {
      loadUrl('https://seller.kuajingmaihuo.com/login/')
    }
  }))

  // menu.append(new MenuItem({
  //   label: 'agentseller',
  //   click: () => {
  //     loadUrl('https://agentseller.temu.com/')
  //   }
  // }))

  menu.append(new MenuItem({
    label: '操作',
    submenu: [
      { label: '重新加载', role: 'reload' },
      { label: '切换开放工具', role: 'toggleDevTools' },
      {
        label: '退出',
        click: () => {
          app.quit()
        }
      }
    ]
  }))

  // Window 菜单
  menu.append(new MenuItem({
    label: 'Window',
    role: 'window',
    submenu: [
      { label: 'Minimize', role: 'minimize' },
      { label: 'Maximize', role: 'maximize' },
      { label: 'Close', role: 'close' }
    ]
  }))

  // 设置应用菜单
  Menu.setApplicationMenu(menu)
}

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

function watchPage() {
  const filter = {
    // urls: ["<all_urls>"]
    urls: ['https://agentseller.temu.com/api/seller/auth/userInfo']
  }
  let requestHeaders = null
  session.defaultSession.webRequest.onSendHeaders(filter, (details) => {
    requestHeaders = details.requestHeaders
    emitter.emit('getRequestHeaders', requestHeaders)
  })
}

function initWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,        // 允许渲染进程使用 Node.js API
      contextIsolation: true,    // 关闭上下文隔离（Vue 2 通常需要此设置）
      // contextIsolation: false,    // 关闭上下文隔离（Vue 2 通常需要此设置）
      preload: path.join(__dirname, 'preload.js')
    }
  })
  if (isDev) {
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
    mainWindow.webContents.openDevTools()
  }
  loadUrl(indexPath)

  // mainWindow.webContents.setWindowOpenHandler(() => {
  //   return { action: 'deny' }
  // })

  // 关闭窗口时默认最小化到托盘
  mainWindow.on('close', (event) => {
    // 只有明确退出时才真正关闭
    if (!app.isQuiting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}
