const HTTP_STATUS_CODES = require('../constant/httpStatusCode')
const BUSINESS_STATUS_CODE = require('../constant/businessStatusCode')
const { isString } = require('lodash')

module.exports = function (err, req, res, next) {
  const resJson = {
    code: BUSINESS_STATUS_CODE.NORMAL_SUCCESS,
    message: 'Internal Server Error',
    data: null
  }
  if (err?.code) {
    resJson.code = err.code
  }
  if (isString(err)) {
    resJson.message = err
  } else if (err?.message) {
    resJson.message = (err?.message).toString()
  }
  res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json(resJson)
}
