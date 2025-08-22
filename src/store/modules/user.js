
const user = {
  namespaced: true,

  state: {
    headers: null,
    apiMode: 'mock'
  },

  mutations: {
    SET_HEADERS: (state, headers) => {
      state.headers = headers
    },
    SET_API_MODE: (state, apiMode) => {
      state.apiMode = apiMode
    }
  }
}

export default user
