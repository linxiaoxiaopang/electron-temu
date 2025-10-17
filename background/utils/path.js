const { app } = require('electron')
const path = require('path')

function getRootPath() {
  const appPath = app.getAppPath()
  let dirName = appPath
  const fIndex = dirName.indexOf('app.asar')
  if (fIndex >= 0) {
    dirName = dirName.substring(0, fIndex)
  }
  return dirName
}

function getPathToRoot(...args) {
  return path.join(getRootPath(), ...args)
}

module.exports = {
  getRootPath,
  getPathToRoot
}
