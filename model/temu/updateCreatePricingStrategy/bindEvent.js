const server = require('./server')
const { factory } = require('../../factory')

module.exports = function () {
  return factory('temu', 'updateCreatePricingStrategy')(server.getAllMethods())
}
