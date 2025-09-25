function createApiFactory(router) {
  return function (apiList) {
    if (!apiList) return
    Object.keys(apiList).map(path => {
      const fn = apiList[path]
      path = `/${path}`
      router.post(path, fn)
    })
  }
}

module.exports = {
  createApiFactory
}
