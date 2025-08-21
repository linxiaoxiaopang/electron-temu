<template>
  <div>
    <div class="item">
      <button @click="onMock('/temu-agentseller/api/seller/auth/userInfo', {}, 'userInfo')">
        /api/seller/auth/userInfo
      </button>
      <div class="result">
        {{ mallId }}
        {{ userInfo }}
      </div>
    </div>
    <div class="item">
      <button @click="
      onMock('/temu-agentseller/api/kiana/gamblers/marketing/enroll/activity/list', {
      needCanEnrollCnt: true,
      needSessionItem: true,
      mallId
    }, 'activityInfo')">
        /api/kiana/gamblers/marketing/enroll/activity/list
      </button>

      <div class="result">
        {{ activityInfo }}
      </div>
    </div>

    <div class="item">
      <button @click="onMock('/temu-agentseller/api/kiana/gamblers/marketing/enroll/scroll/match', {
      mallId,
      activityType,
      rowCount: 50
    }, 'matchInfo')">
        /api/kiana/gamblers/marketing/enroll/scroll/match
      </button>

      <div class="result">
        {{ matchInfo }}
      </div>
    </div>

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
  data() {
    return {
      userInfo: null,
      activityInfo: null,
      matchInfo: null
    }
  },

  computed: {
    ...mapState('user', ['headers']),

    mallId({ userInfo }) {
      return userInfo?.companyList?.[0]?.malInfoList?.[0]?.mallId || ''
    },

    activityType({ activityInfo }) {
      return activityInfo?.activityList?.[0]?.activityType || ''
    }
  },

  mounted() {
    createExpressApp()
  },


  methods: {
    async onMock(url, data, prop) {
      const res = await service({
        url,
        data,
        method: 'post'
      })
      this[prop] = res?.data?.data
    }
  }
}

</script>

<style scoped>

.item {
    padding: 10px;
    border: 1px solid #001aff;
    margin-bottom: 10px;
    max-height: 150px;
    overflow: auto;
}

button {
    display: block;
    margin-bottom: 10px;
}

.result {
    border: 1px solid #eee;
    padding: 10px;
}
</style>
