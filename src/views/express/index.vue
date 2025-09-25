<template>
  <div>
    <ZdRadioGroup
      style="margin-bottom: 20px;"
      v-model="mode"
    >
      <ZdRadio :value="mode" label="proxy">使用本地电脑代理真实数据</ZdRadio>
      <ZdRadio :value="mode" label="temu">直接连接真实数据</ZdRadio>
    </ZdRadioGroup>

    <div class="headers" style="margin-bottom: 10px">
     <span v-if="!headers">
      未获取temu店铺，请刷新temu页面。
     </span>
      <div class="content" v-else>
        <div v-if="port">监听端口：{{ port }}</div>
        <div>店铺名称：{{ userInfo.mallName }}</div>
        <div>店铺id：{{ userInfo.mallId }}</div>
        <div>店铺类型：{{ userInfo.managedType }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex'
import ZdRadioGroup from './module/zdRadioGroup'
import ZdRadio from './module/zdRadio'

export default {
  components: {
    ZdRadioGroup,
    ZdRadio
  },

  computed: {
    ...mapState('background', ['user']),

    mode: {
      get() {
        return this.user?.apiMode
      },

      async set(val) {
        if (!this.user) return
        this.user.apiMode = val
        await this.SetBackgroundStore({
          key: 'user',
          value: this.user
        })
      }
    },

    headers({ user }) {
      return user?.headers
    },

    userInfo({ user }) {
      return user?.userInfo?.mallList?.[0] || {}
    },

    port({ user }) {
      return user?.port
    }
  },

  methods: {
    ...mapActions('background', ['SetBackgroundStore'])
  }
}

</script>

<style scoped>
.content {
    display: inline-block;
    border: 1px solid #eee;
    padding: 15px;
    border-radius: 4px;
}
</style>
