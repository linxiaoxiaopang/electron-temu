const { customIpcRenderer } = require('~/utils/event')

async function list(req, res, next) {
  const { body } = req
  const { page, ...where } = body
  res.customResult = await customIpcRenderer.invoke('db:temu:personalProduct:find', {
    where,
    page
  })
  next()
}

async function add(req, res, next) {
  const { body } = req
  res.customResult = await customIpcRenderer.invoke('db:temu:personalProduct:add', body)
  next()
}



module.exports = {
  list,
  add
}
