const { customIpcRenderer } = require('~utils/event')

async function list(req, res, next) {
  const { body } = req
  const { mallId, page, ...where } = body
  res.customResult = await customIpcRenderer.invoke('db:temu:pricingStrategyHistory:find', {
    where,
    page
  })
  next()
}

module.exports = {
  list
}
