module.exports = function (err, ctx, next) {
  const { res } = ctx
  const response = [true, err]
  res.send(response)
  next()
}
