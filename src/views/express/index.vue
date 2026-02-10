<template>
  <div>
    <div class="headers" style="margin-bottom: 10px">
     <span v-if="!existMall">
      未获取temu店铺，请刷新temu页面。
     </span>
      <template v-else>
        <div class="content-container">
          <div class="content" :key="index" v-for="(item, origin, index) in mallList" >
            <div v-if="port">监听端口：{{ port }}</div>
            <div>来源：{{ origin }}</div>
            <div class="item" :key="`${index}_${key}`" v-for="(sItem, key) in item.list">
              <div>店铺名称：{{ userInfo(sItem.userInfo).mallName }}</div>
              <div>店铺id：{{ userInfo(sItem.userInfo).mallId }}</div>
              <div>店铺类型：{{ userInfo(sItem.userInfo).managedType }}</div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex'

export default {
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

    mallList({ user }) {
      return user?.mallList || {}
    },

    existMall({ mallList }) {
      return Object.keys(mallList).length
    },

    userInfo() {
      return (row) => {
        return row?.mallList?.[0] || {}
      }
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
.content-container {
    display: flex;
    flex-wrap: wrap;
}

.content {
    display: inline-block;
    border: 1px solid #eee;
    padding: 15px;
    border-radius: 4px;
    margin: 5px;
}

.item {
    margin: 5px;
    padding: 5px;
    border: 1px solid #8590f3;
    border-radius: 4px;
}
</style>
