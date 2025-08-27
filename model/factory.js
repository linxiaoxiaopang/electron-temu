const { ipcMain } = require('electron')

function factory(db, sheet) {
  return function (fnMap = {}) {
    Object.keys(fnMap).map(op => {
      const eventName = `db:${db}:${sheet}:${op}`
      ipcMain.handle(eventName, async (event, ...args) => {
        return await fnMap[op](...args)
      })
    })
  }
}

module.exports = {
  factory
}
