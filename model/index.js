const menu = require('./temu/index')

async function init () {
  return await Promise.all([menu.init()])
}

init()
