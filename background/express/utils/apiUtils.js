function createApiFactory(router) {
  return function (apiList, namespace = '') {
    if (!apiList) return
    Object.keys(apiList).map(path => {
      const fn = apiList[path]
      if (namespace) {
        path = `/${namespace}/${path}`
      } else {
        path = `/${path}`
      }
      router.post(path, fn)
    })
  }
}

module.exports = {
  createApiFactory
}
