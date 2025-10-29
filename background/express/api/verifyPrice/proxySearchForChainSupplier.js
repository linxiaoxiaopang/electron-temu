const { getFullSearchForChainSupplierData } = require('../../controllers/verifyPrice/searchForChainSupplier')

async function list(req, res, next) {
  const query = req.body
  const response = await getFullSearchForChainSupplierData({
    req,
    query
  })
  res.customResult = [false, response?.data]
  next()
}

module.exports = {
  list
}
