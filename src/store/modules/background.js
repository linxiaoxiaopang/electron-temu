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

const fn = async () => {
  const res = await window.electronAPI.invoke('data:get:store')
  Object.keys(res).map(key => {
    background.state[key] = res[key]
  })
  setTimeout(() => {
    fn()
  }, 3000)
}

fn()

export default background
