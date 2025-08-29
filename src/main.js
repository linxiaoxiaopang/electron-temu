import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import '@/express/init'
import '@/express/timer/verifyPrice'

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
