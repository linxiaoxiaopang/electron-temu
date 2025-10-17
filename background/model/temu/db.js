const { getPathToRoot } = require('~/utils/path')

const { Sequelize } = require('sequelize')

const storage = getPathToRoot('dbData', 'db.sqlite')
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storage,
  logging: false
})
module.exports = sequelize
