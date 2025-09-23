<template>
  <div>
    <ZdRadioGroup
      style="margin-bottom: 20px;"
      v-model="mode"
    >
      <ZdRadio :value="mode" label="mock">使用mock数据</ZdRadio>
      <ZdRadio :value="mode" label="proxy">使用本地电脑代理真实数据</ZdRadio>
      <ZdRadio :value="mode" label="temu">直接连接真实数据</ZdRadio>
    </ZdRadioGroup>

    <div class="headers" style="margin-bottom: 10px">
     <span v-if="!headers">
      未获取temu店铺，请刷新temu页面。
     </span>
      <div class="content" v-else>
        <div>店铺名称：{{ realUserInfo.mallName }}</div>
        <div>店铺id：{{ realUserInfo.mallId }}</div>
        <div>店铺类型：{{ realUserInfo.managedType }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import ZdRadioGroup from './module/zdRadioGroup'
import ZdRadio from './module/zdRadio'

export default {
  components: {
    ZdRadioGroup,
    ZdRadio
  },

  computed: {
    ...mapState('user', ['headers', 'apiMode', 'userInfo']),

    mode: {
      get() {
        return this.apiMode
      },
      set(val) {
        this.$store.commit('user/SET_API_MODE', val)
      }
    },

    realUserInfo({ userInfo }) {
      return userInfo?.mallList?.[0] || {}
    }
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
