const { app } = require('electron')
 const appPath = app.getAppPath()
const { Sequelize } = require('sequelize')
const path = require('path')
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.resolve(appPath, 'dbData', 'db.sqlite'),
  logging: false
})

module.exports = sequelize
