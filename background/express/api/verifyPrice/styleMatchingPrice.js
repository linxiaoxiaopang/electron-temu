const { customIpcRenderer } = require('~/utils/event')

async function list(req, res, next) {
  const { body } = req
  const { mallId, page, ...where } = body
  res.customResult = await customIpcRenderer.invoke('db:temu:styleMatchingPrice:find', {
    where,
    page
  })
  next()
}

async function update(req, res, next) {
  const { body } = req
  res.customResult = await customIpcRenderer.invoke('db:temu:styleMatchingPrice:batchUpdate', body)
  next()
}

async function del(req, res, next) {
  const { body } = req
  res.customResult = await customIpcRenderer.invoke('db:temu:styleMatchingPrice:delete', {
    where: body
  })
  next()
}

async function create(req, res, next) {
  const { body } = req
  res.customResult = await customIpcRenderer.invoke('db:temu:styleMatchingPrice:add', body)
  next()
}

module.exports = {
  list,
  update,
  del,
  create
}
