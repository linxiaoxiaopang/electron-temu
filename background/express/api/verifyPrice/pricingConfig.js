const { customIpcRenderer } = require('~/utils/event')

async function list(req, res, next) {
  let [err, response] = await customIpcRenderer.invoke('db:temu:pricingConfig:find', {
    where: {
      id: 1
    }
  })
  response = response?.[0]
  if (response) response.currentServeTimestamp = Date.now()
  res.customResult = [err, response]
  next()
}

async function update(req, res, next) {
  const { body } = req
  let [err, response] = await customIpcRenderer.invoke('db:temu:pricingConfig:update', 1, {
    ...body,
    lastExecuteTimestamp: Date.now()
  })
  if (!err) {
    const { id, ...rest } = response
    await customIpcRenderer.invoke('db:temu:pricingConfigHistory:add', rest)
  }
  if (response) response.currentServeTimestamp = Date.now()
  res.customResult = [err, response]
  next()
}


module.exports = {
  list,
  update
}
