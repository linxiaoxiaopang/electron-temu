require('module-alias/register')
const { indexPath } = require('~store/env.js')
require('~/model')
require('~/express/init')
require('~/express/timer/verifyPrice')
const { watchUserInfo } = require('~/utils/watch')
const { URL } = require('node:url')
const { customIpc } = require('~/utils/event')
const { ViewMenu, ViewTray } = require('~/utils/view')
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

app.whenReady().then(() => {
  watchUserInfo()
  initWindow()
  createMenu()
  createTray()
})

function loadUrl(url) {
  if (url.startsWith('http')) return mainWindow.loadURL(url)
  mainWindow.loadFile(path.join(__dirname, url))
}

const temuUrlList = {
  default: 'https://seller.kuajingmaihuo.com/login/',
  current: ''
}


// 创建托盘图标
function createTray() {
  const viewTrayInstance = new ViewTray({
    mainWindow
  })
  viewTrayInstance.action()
}

function createMenu() {
  const viewMenuInstance = new ViewMenu({
    mainWindow,
    temuUrlList
  })
  viewMenuInstance.action()
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
    const chokidar = require('chokidar')
    // 监听渲染进程文件变化，自动刷新
    const watcher = chokidar.watch(path.join(__dirname, '../src'), {
      ignoreInitial: true
    })

    watcher.on('change', (path) => {
      console.log(`文件变化: ${path}，自动刷新...`)
      mainWindow.reload()
    })
  }
  loadUrl(indexPath)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    const url = details.url
    collectTemuUrl(url)
    loadUrl(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-navigate-in-page', (event, url, isMainFrame) => {
    collectTemuUrl(url)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      window.close = () => {
        console.log('window.close() 已被重写');
        // window.electronAPI.invoke('window:close')
      }
  `)
  })


  // 关闭窗口时默认最小化到托盘
  mainWindow.on('close', (event) => {
    // 只有明确退出时才真正关闭
    if (!app.isQuiting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

function collectTemuUrl(url) {
  if (url.indexOf('https://agentseller.temu.com') >= 0) {
    const urlInstance = new URL(url)
    const redirectUrl = urlInstance.searchParams.get('redirectUrl')
    temuUrlList.current = url
    if (redirectUrl) temuUrlList.current = redirectUrl
  }
}
