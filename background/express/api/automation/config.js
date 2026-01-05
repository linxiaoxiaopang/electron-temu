const { customIpcRenderer } = require('~/utils/event')

async function list(req, res, next) {
  let [err, response] = await customIpcRenderer.invoke('db:temu:automationConfig:find', {
    where: {
      id: 1
    }
  })
  response = response?.[0]
  if (response) {
    response.currentServeTimestamp = Date.now()
    response.mallIds = JSON.parse(response.mallIds || '[]')
  }
  res.customResult = [err, response]
  next()
}

async function update(req, res, next) {
  const { body } = req
  let [err, response] = await customIpcRenderer.invoke('db:temu:automationConfig:update', 1, {
    ...body,
    lastExecuteTimestamp: Date.now()
  })
  if (response) response.currentServeTimestamp = Date.now()
  res.customResult = [err, response]
  next()
}


module.exports = {
  list,
  update
}
