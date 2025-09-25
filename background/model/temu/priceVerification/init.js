const { requiredModelDefine } = require('../../utils/requireUtils')

module.exports = {
  async init() {
    return await requiredModelDefine(__dirname)
  }
}
