const { isArray } = require('lodash')
const { formatTimeZoneAndTime } = require('../../timeUtils')

class ResDataFormatter {
  constructor(ctx) {
    this.ctx = ctx
  }

  get req() {
    return this.ctx?.req
  }

  get res() {
    return this.ctx?.res
  }

  get jsonToObjectProps() {
    const jsonToObjectProps = this.req?.jsonToObjectProps
    if (!jsonToObjectProps) return []
    if (isArray(jsonToObjectProps)) return jsonToObjectProps
    return [jsonToObjectProps]
  }

  formatTime(resItem) {
    if (!resItem) return
    if (resItem.createTime) {
      resItem.createTime = formatTimeZoneAndTime(resItem.createTime)
    }
    if (resItem.updateTime) {
      resItem.updateTime = formatTimeZoneAndTime(resItem.updateTime)
    }
  }

  parseJson(resItem) {
    this.jsonToObjectProps.map(prop => {
      if (!resItem[prop]) return
      resItem[prop] = JSON.parse(resItem[prop])
    })
  }

  format(resItem) {
    this.formatTime(resItem)
    this.parseJson(resItem)
    return resItem
  }

  action() {
    const data = this.res.data
    if (isArray(data)) {
      return data.map(item => {
        this.format(item)
      })
    }
    return this.format(data)
  }
}

module.exports = (ctx, next) => {
  new ResDataFormatter(ctx).action()
  next()
}
