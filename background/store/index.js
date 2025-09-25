const { ipcMain } = require('electron')

const { user } = require('./user')

const store = {
  user
}

ipcMain.handle('data:get:store', (event) => {
  return store
})

ipcMain.handle('data:set:store', (event, key, value) => {
  const storeValue = store[key]
  if (!storeValue) return
  Object.assign(storeValue, value)
})

module.exports = store
