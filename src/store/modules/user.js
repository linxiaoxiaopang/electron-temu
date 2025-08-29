const user = {
  namespaced: true,

  state: {
    headers: null,
    apiMode: 'mock',
    userInfo: null
  },

  mutations: {
    SET_HEADERS: (state, headers) => {
      state.headers = headers
    },

    SET_USER_INFO: (state, userInfo) => {
      state.userInfo = userInfo

    },

    SET_API_MODE: (state, apiMode) => {
      state.apiMode = apiMode
    }
  },

  actions: {
    SetUserInfo({ commit }, data) {
      const { headers, userInfo } = data
      headers.mallid = userInfo?.mallList?.[0]?.mallId
      commit('SET_HEADERS', headers)
      commit('SET_USER_INFO', userInfo)
    }
  }
}

export default user
