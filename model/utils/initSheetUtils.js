const { factory } = require('../factory')
const { CreateServer } = require('./serverUtils')

class InitSheet {
  constructor(
    {
      eventPath,
      model
    }
  ) {
    this.eventPath = eventPath
    this.model = model
    this.server = new CreateServer(model)
  }

  bindEvent() {
    const [dataBase, sheet] = this.eventPath.split('.')
    return factory(dataBase, sheet)(this.server.getAllMethods())
  }

  async syncModel() {
    await this.model.sync({ alter: true })
  }

  async init() {
    this.bindEvent()
    await this.syncModel()
  }
}

module.exports = {
  InitSheet
}
