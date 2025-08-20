import store from '@/store'
import service from '@/service/request'

export default function (option) {
  const { target } = option
  return async function (req, res) {
    const headers = store.state.user.headers
    const { method, url, body } = req
    const wholeUrl = `${target}${url}`
    const response = await service({
      method,
      headers,
      data: body,
      url: wholeUrl
    })
    res.json(response.data)
  }
}
