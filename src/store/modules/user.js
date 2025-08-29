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
      state.headers.maillid = userInfo?.mallList?.[0]?.mallId
    },
    SET_API_MODE: (state, apiMode) => {
      state.apiMode = apiMode
    }
  }
}

export default user
