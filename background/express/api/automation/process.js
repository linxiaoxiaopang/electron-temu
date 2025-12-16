const { customIpcRenderer } = require('~utils/event')
const { GetTemuProductData } = require('~express/controllers/automation/process')

async function list(req, res, next) {
  const { uIdList } = req.body
  res.customResult = await customIpcRenderer.invoke('db:temu:automationProcess:find', {
    where: {
      uId: {
        'op:in': uIdList
      }
    }
  })
  next()
}

async function add(req, res, next) {
  const { data } = req.body
  if(!data.length) return [false, data]
  res.customResult = await customIpcRenderer.invoke('db:temu:automationProcess:add', data)
  next()
}

async function sync(req, res, next) {
  req.body.page = {
    pageIndex: 1,
    pageSize: 20
  }

  const instance = new GetTemuProductData({
    req,
    res
  })
  res.customResult = await instance.action()
  next()
}


module.exports = {
  list,
  add,
  sync
}
