import store from '@/store'

export default function (req, res, next) {
  const headers = store.state.user.headers
  const { mallId } = req.body
  if (!headers) {
    return res.json({
      code: 0,
      data: 'headers 未获取',
      message: 'headers 未获取'
    })
  }
  if (!mallId) return next()
  if (mallId == headers?.mallid) return next()
  return res.json({
    code: 0,
    data: 'temu店铺id不一致',
    message: 'temu店铺id不一致'
  })
}
