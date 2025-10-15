const axios = require('axios')
const { getPort } = require('~store/user')

module.exports = getPort().then(port => {
  return axios.create({
    baseURL: `http://localhost:${port}` // api 的 base_url
  })
})
