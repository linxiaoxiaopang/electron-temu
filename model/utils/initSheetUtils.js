const { BrowserWindow } = require('electron')
const { factory } = require('../factory')
const { CreateServer } = require('./serverUtils')
const MAX_SAFE_DELAY = 2147483647

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

class InitTimerSheet extends InitSheet {
  constructor(option) {
    super((option))
    this.record = null
    this.timer = null
  }

  get interval() {
    return this?.record?.interval
  }

  get autoplay() {
    return this.record?.autoplay
  }

  sendMessage() {
    BrowserWindow.getAllWindows().forEach(window => {
      if (window.webContents) {
        const eventName = `${this.model.name}:timer:update`
        window.webContents.send(eventName, this.record)
      }
    })
  }

  setInterval() {
    const { min } = Math
    if (!this.autoplay || !this.interval) {
      clearInterval(this.timer)
      return
    }
    this.sendMessage()
    this.timer = setTimeout(() => {
      this.setInterval()
    }, min(this.interval, MAX_SAFE_DELAY))
  }

  bindTimerEvent() {
    this.server.emitter.on('update', res => {
      this.prevAutoplay = this.autoplay
      this.record = res
      if (this.prevAutoplay == this.autoplay) return
      this.setInterval()
    })
  }

  async syncModel() {
    await super.syncModel()
    const [err, res] = await this.server.find({
      where: {
        id: 1
      }
    })
    if (err) return
    this.record = res?.[0]
    if (!res || !res?.length) {
      await this.server.add({})
      const [err1, res1] = await this.server.find({
        where: {
          id: 1
        }
      })
      if (err1) return
      this.record = res1?.[0]
    }
    this.bindTimerEvent()
    this.setInterval()
  }
}

module.exports = {
  InitSheet,
  InitTimerSheet
}
