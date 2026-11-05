const { ipcMain, dialog } = require('electron')
const { previewImageGroups, runImageGroups } = require('~utils/imageGroup')

const PROGRESS_CHANNEL = 'imageGroup:progress'
const PROGRESS_INTERVAL = 100

let running = false
let cancelled = false
let progressTimer = null
let pendingProgress = null
let lastProgressAt = 0

function sendToWindow(getWindow, channel, payload) {
  const window = typeof getWindow === 'function' ? getWindow() : null
  if (!window || window.isDestroyed()) return
  const contents = window.webContents
  if (!contents || contents.isDestroyed()) return
  contents.send(channel, payload)
}

// 进度按 100ms 节流，避免大目录下 IPC 洪泛
function createProgressSender(getWindow) {
  const flush = () => {
    progressTimer = null
    if (!pendingProgress) return
    const payload = pendingProgress
    pendingProgress = null
    lastProgressAt = Date.now()
    sendToWindow(getWindow, PROGRESS_CHANNEL, payload)
  }

  return payload => {
    const now = Date.now()
    const elapsed = now - lastProgressAt
    if (elapsed >= PROGRESS_INTERVAL) {
      lastProgressAt = now
      sendToWindow(getWindow, PROGRESS_CHANNEL, payload)
      return
    }
    pendingProgress = payload
    if (!progressTimer) {
      progressTimer = setTimeout(flush, PROGRESS_INTERVAL - elapsed)
    }
  }
}

function resetProgressState() {
  if (progressTimer) {
    clearTimeout(progressTimer)
    progressTimer = null
  }
  pendingProgress = null
  lastProgressAt = 0
}

function registerImageGroupIpc(options = {}) {
  const { getWindow } = options

  ipcMain.handle('imageGroup:selectDirectory', async (event, args = {}) => {
    try {
      const window = typeof getWindow === 'function' ? getWindow() : null
      const dialogOptions = {
        title: args.title || '选择文件夹',
        properties: ['openDirectory', 'createDirectory']
      }
      const result = window && !window.isDestroyed()
        ? await dialog.showOpenDialog(window, dialogOptions)
        : await dialog.showOpenDialog(dialogOptions)

      if (result.canceled || !result.filePaths.length) return { cancelled: true }
      return { path: result.filePaths[0] }
    } catch (error) {
      return { error: error.message }
    }
  })

  ipcMain.handle('imageGroup:scan', async (event, args = {}) => {
    try {
      return await previewImageGroups(args)
    } catch (error) {
      return { error: error.message }
    }
  })

  ipcMain.handle('imageGroup:start', async (event, args = {}) => {
    if (running) return { error: '已有整理任务正在执行，请稍候' }
    running = true
    cancelled = false
    resetProgressState()

    try {
      return await runImageGroups({
        ...args,
        isCancelled: () => cancelled,
        onProgress: createProgressSender(getWindow)
      })
    } catch (error) {
      return { error: error.message }
    } finally {
      running = false
      cancelled = false
      resetProgressState()
    }
  })

  ipcMain.handle('imageGroup:cancel', async () => {
    cancelled = true
    return { ok: true, running }
  })
}

module.exports = registerImageGroupIpc
