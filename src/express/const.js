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
  headers: {
    get() {
      return store.state.user.headers
    }
  }
})
