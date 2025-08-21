import Vue from 'vue'
import Router from 'vue-router'
Vue.use(Router)

export const routes = [
  {
    path: '/',
    redirect: '/express'
  },
  {
    path: '/express',
    component: () => import('@/views/express')
  }
]

export default new Router({
  mode: 'hash',
  scrollBehavior: () => ({ y: 0 }),
  routes: [...routes]
})
