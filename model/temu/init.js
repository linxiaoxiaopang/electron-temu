const { requiredModelDefine } = require('../utils/requireUtils')

async function init() {
  return await requiredModelDefine(__dirname, ['const'])
}

module.exports = {
  init
}
