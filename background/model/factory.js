const { customIpc } = require('~/utils/event')

function factory(db, sheet) {
  return function (fnMap = {}) {
    Object.keys(fnMap).map(op => {
      const eventName = `db:${db}:${sheet}:${op}`
      customIpc.handle(eventName, async (...args) => {
        return await fnMap[op](...args)
      })
    })
  }
}

module.exports = {
  factory
}
