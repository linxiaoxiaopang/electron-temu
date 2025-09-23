const menu = require('./temu/init')

async function init () {
  return await Promise.all([menu.init()])
}

init()
