const model = require('./define')
const { InitTimerSheet } = require('../../../utils/initSheetUtils')

module.exports = new InitTimerSheet({
  model,
  eventPath: 'temu.userAuth'
})
