module.exports =  function (ctx, next) {
  const { res } = ctx
  const response = [false, res.data]
  if (res.page) {
    response.push({
      page: res.page
    })
  }
  res.send(response)
  next()
}
