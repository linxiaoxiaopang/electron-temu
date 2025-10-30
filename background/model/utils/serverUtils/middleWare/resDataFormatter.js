const { isArray, uniq, get } = require('lodash')
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

  get usedJsonProp() {
    return this.req?.usedJsonProp
  }

  get finalJsonToObjectProps() {
    const tmpArr = []
    tmpArr.push(...this.jsonToObjectProps)
    if (this.usedJsonProp) tmpArr.push(this.usedJsonProp)
    return uniq(tmpArr)
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
    this.finalJsonToObjectProps.map(prop => {
      if (!resItem[prop]) return
      resItem[prop] = JSON.parse(resItem[prop])
    })
  }

  format(resItem) {
    this.formatTime(resItem)
    this.parseJson(resItem)
    return resItem
  }

  formatData() {
    const data = this.res.data
    if (isArray(data)) {
      return data.map(item => {
        this.format(item)
      })
    }
    return this.format(data)
  }

  useJsonReplaceItem(data) {
    if (!this.usedJsonProp) return data
    if (isArray(data)) return data.map(item => this.useJsonReplaceItem(item))
    const newItem = get(data, this.usedJsonProp, {})
    newItem._dataBaseId = data.id
    return newItem
  }

  action() {
    this.formatData()
    this.res.data = this.useJsonReplaceItem(this.res.data || [])
  }
}

module.exports = (ctx, next) => {
  new ResDataFormatter(ctx).action()
  next()
}
