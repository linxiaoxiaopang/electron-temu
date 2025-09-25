const background = {
  namespaced: true,

  state: {
    user: null
  },

  mutations: {},

  actions: {
    SetBackgroundStore({ commit }, { key, value }) {
      return window.electronAPI.invoke('data:set:store', key, value)
    }
  }
}

window.electronAPI.invoke('data:get:store').then(res => {
  Object.keys(res).map(key => {
    background.state[key] = res[key]
  })
})

export default background
