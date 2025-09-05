const store = require('@/store').default

Object.defineProperties(exports, {
  apiMode: {
    get() {
      return store.state.user.apiMode
    }
  },

  isMock: {
    get() {
      return store.state.user.apiMode === 'mock'
    }
  },

  isProxy: {
    get() {
      return store.state.user.apiMode === 'proxy'
    }
  },

  headers: {
    get() {
      return store.state.user.headers
    }
  },

  temuTarget: {
    get() {
      return exports.isProxy ? 'http://192.168.10.81:3000/temu-agentseller' : 'https://agentseller.temu.com'
    }
  }
})

exports.getIsMock = function () {
  return store.state.user.apiMode === 'mock'
}

exports.getTemuTarget=function () {
  return exports.isProxy ? 'http://192.168.10.81:3000/temu-agentseller' : 'https://agentseller.temu.com'
}
