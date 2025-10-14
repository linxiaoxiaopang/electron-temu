const { Menu, MenuItem, app, Tray } = require('electron')
const store = require('~store')
const { indexPath } = require('~store/env.js')
const path = require('path')

class ViewMenu {
  constructor(
    {
      mainWindow,
      temuUrlList
    }
  ) {
    this.menu = new Menu()
    this.mainWindow = mainWindow
    this.temuUrlList = temuUrlList
  }

  loadUrl(url) {
    const mainWindow = this.mainWindow
    if (url.startsWith('http')) return mainWindow.loadURL(url)
    mainWindow.loadFile(path.resolve(app.getAppPath(), url))
  }

  append(options) {
    const menuItem = new MenuItem(options)
    this.menu.append(menuItem)
  }

  appendHome() {
    this.append({
      label: '首页',
      click: () => {
        this.loadUrl(indexPath)
      }
    })
  }

  appendTemuToolbox() {
    this.append({
      label: 'temu工具',
      click: () => {
        this.loadUrl('https://toolbox.zdcustom.com/#/')
      }
    })
  }

  appendTemuPlatform() {
    this.append({
      label: 'temu平台',
      click: () => {
        let url = this.temuUrlList.default
        const existMall = Object.keys(store?.user?.mallList).length > 0
        if (existMall) {
          url = this.temuUrlList.current
        }
        this.loadUrl(url)
      }
    })
  }

  appendOperation() {
    this.append({
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
    })
  }

  appendWindow() {
    this.append({
      label: 'Window',
      role: 'window',
      submenu: [
        { label: 'Minimize', role: 'minimize' },
        { label: 'Maximize', role: 'maximize' },
        { label: 'Close', role: 'close' }
      ]
    })
  }

  action() {
    this.appendHome()
    this.appendTemuToolbox()
    this.appendTemuPlatform()
    this.appendOperation()
    this.appendWindow()
    Menu.setApplicationMenu(this.menu)
  }
}

class ViewTray {
  constructor(
    {
      mainWindow
    }
  ) {
    const iconPath = path.join(app.getAppPath(), 'public/favicon.ico')
    this.trayList = []
    this.mainWindow = mainWindow
    this.tray = new Tray(path.join(iconPath))
  }

  showWindow() {
    const options = {
      label: '显示窗口',
      click: () => {
        this.mainWindow.show()
      }
    }
    this.trayList.push(options)
  }

  quit() {
    const options = {
      label: '退出',
      click: () => {
        app.isQuiting = true
        app.quit()
      }
    }
    this.trayList.push(options)
  }

  action() {
    this.tray.setToolTip('temu应用')
    this.showWindow()
    this.quit()
    const contextMenu = Menu.buildFromTemplate(this.trayList)
    this.tray.setContextMenu(contextMenu)
    // 单击托盘图标显示/隐藏窗口
    this.tray.on('click', () => {
      this.mainWindow.isVisible() ? this.mainWindow.hide() : this.mainWindow.show()
    })
  }
}

module.exports = {
  ViewMenu,
  ViewTray
}
