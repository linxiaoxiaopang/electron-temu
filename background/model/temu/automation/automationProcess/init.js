const model = require('./define')
const { InitSheet } = require('~model/utils/initSheetUtils')

module.exports = new InitSheet({
  model,
  eventPath: 'temu.automationProcess'
})
