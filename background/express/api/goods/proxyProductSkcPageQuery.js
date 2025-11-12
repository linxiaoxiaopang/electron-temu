const { getWholeUrl } = require('~store/user')
const { createProxyToGetTemuData, getUsedHeaders } = require('~express/middleware/proxyMiddleware')
const axios = require('axios')
const FormData = require('form-data')

async function list(req, res, next) {
  const relativeUrl = '/visage-agent-seller/product/skc/pageQuery'
  const wholeUrl = getWholeUrl(relativeUrl)
  const response = await createProxyToGetTemuData(req)(wholeUrl)
  res.customResult = [false, response?.data?.pageItems || [], response.page]
  next()
}

async function upload(req, res, next) {
  const { url_width_height, image, upload_sign } = req.body
  const relativeUrl = '/api/galerie/v3/store_image?sdk_version=js-0.0.49&tag_name=product-material-tag'
  const wholeUrl = getWholeUrl(relativeUrl)
  const form = new FormData()
  form.append('url_width_height', url_width_height)
  form.append('image', image.buffer)
  form.append('upload_sign', upload_sign)
  let err = false
  const response = await axios({
    url: wholeUrl,
    method: 'POST',
    data: form
  }).catch(e => {
    err = e
  })
  res.customResult = [err, err || response?.data]
  next()
}

module.exports = {
  list,
  upload
}
