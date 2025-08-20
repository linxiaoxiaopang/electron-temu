
const user = {
  namespaced: true,

  state: {
    headers: null
  },

  mutations: {
    SET_HEADERS: (state, headers) => {
      state.headers = headers
    }
  }
}

export default user
