const model = require('./define')
const { InitSheet } = require('../../utils/initSheetUtils')

module.exports = new InitSheet({
  model,
  eventPath: 'temu.extCodeSearchForChainSupplier'
})
