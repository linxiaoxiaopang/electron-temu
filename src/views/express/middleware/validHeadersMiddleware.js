import store from '@/store'

export default function (req, res, next) {
  const headers = store.state.user.headers
  if (!headers) {
    res.json({
      code: 0,
      data: 'headers 未获取'
    })
    return
  }
  next()
}
