const { app } = require('electron')
const appPath = app.getAppPath()
const { Sequelize } = require('sequelize')
const path = require('path')
let dirName = appPath
const fIndex = dirName.indexOf('app.asar')
if (fIndex >= 0) {
  dirName = dirName.substring(0, fIndex)
}

const storage = path.join(dirName, 'dbData', 'db.sqlite')
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storage,
  logging: false
})
module.exports = sequelize
