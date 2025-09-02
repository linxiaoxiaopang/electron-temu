const HTTP_STATUS_CODES = require('@/express/constant/httpStatusCode')
const BUSINESS_STATUS_CODE = require('@/express/constant/businessStatusCode')

export default function (err, req, res, next) {
  const resJson = {
    code: BUSINESS_STATUS_CODE.NORMAL_SUCCESS,
    message: 'Internal Server Error',
    data: null
  }
  if (err?.code) {
    resJson.code = err.code
  }
  if (err?.message) {
    resJson.message = (err?.message).toString()
  }
  res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json(resJson)
}
