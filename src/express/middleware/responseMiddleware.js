const BUSINESS_STATUS_CODE = require('@/express/constant/businessStatusCode')
const HTTP_STATUS_CODES = require('@/express/constant/httpStatusCode')
const { isArray, isBoolean, isNumber, merge } = require('lodash')

export default function (req, res, next) {
  const { customResult } = res
  if (!isArray(customResult) || !isBoolean(customResult[0])) return next()
  const [err, res0, res1] = customResult
  const resJson = {
    code: BUSINESS_STATUS_CODE.NORMAL_SUCCESS,
    message: '',
    data: null
  }
  if (err) {
    const code = isNumber(err) ? err : BUSINESS_STATUS_CODE.NORMAL_ERROR
    resJson.code = code
    resJson.message = res0?.message || res0 || ''
  } else {
    resJson.data = res0
    if (res1) {
      merge(resJson, res1)
    }
  }
  try {
    res.status(HTTP_STATUS_CODES.SUCCESS).json(resJson)
  } catch (err) {
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).send('Failed to send response')
  }
}
