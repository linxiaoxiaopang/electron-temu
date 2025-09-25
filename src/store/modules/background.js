const background = {
  namespaced: true,

  state: {
    user: null
  },

  mutations: {},

  actions: {
    SetBackgroundStore({ commit }, { key, value }) {
      return window.ipcRenderer.invoke('data:set:store', key, value)
    }
  }
}

window.ipcRenderer.invoke('data:get:store').then(res => {
  Object.keys(res).map(key => {
    background.state[key] = res[key]
  })
})

export default background
