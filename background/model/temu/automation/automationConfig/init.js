const model = require('./define')
const { InitTimerSheet } = require('~model/utils/initSheetUtils')

module.exports = new InitTimerSheet({
  model,
  immediate: true,
  eventPath: 'temu.automationConfig'
})
