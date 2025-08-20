<template>
  <div>
    <button @click="onMock('/temu-seller/bg/quiet/api/mms/userInfo')">
      /bg/quiet/api/mms/userInfo
    </button>
    <button @click="onMock('/temu-agentseller/api/kiana/gamblers/marketing/enroll/activity/list')">
      /api/kiana/gamblers/marketing/enroll/activity/list
    </button>
    <button @click="onMock('/temu-agentseller/api/kiana/gamblers/marketing/enroll/scroll/match')">
      /api/kiana/gamblers/marketing/enroll/scroll/match
    </button>
    <button @click="onMock('/temu-seller/bg-anniston-mms/category/children/list')">
      /bg-anniston-mms/category/children/list
    </button>
    <div class="headers">
     <span v-if="!headers">
       未获取到temu的请求头，请刷新temu页面
     </span>
      <span v-else>
        <div>请求头信息</div>
        <div>
          <div style="margin-bottom: 15px;border: 1px solid #eee;padding: 5px;" v-for="(value, key) in headers"
               :key="key">
            <div>
              <span style="display: inline-block;margin-right: 20px;">{{ key }}:</span>
              <span>{{ value }}</span>
              </div>
          </div>
        </div>
      </span>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { createExpressApp } from './utils'
import service from '@/service/request'

export default {
  computed: {
    ...mapState('user', ['headers'])
  },

  mounted() {
    createExpressApp()
  },

  methods: {
    async onMock(url) {
      const res = await service({
        url,
        method: 'post',
        data: {
          page: {
            pageIndex: 1,
            pageSize: 24
          }
        }
      })
      console.log('res', res)
    }
  }
}

</script>

<style scoped>
button {
    display: block;
    margin-bottom: 10px;
}
</style>
