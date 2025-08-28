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
      mallId,
      filter: {
        json: {
           activityType: 13
        },
        page: {
          pageIndex: 1,
          pageSize: 3
        }
      }
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

    <div class="item">
      <button @click="onMock('/temu-agentseller/api/kiana/mms/robin/searchForSemiSupplier', {
      mallId,
      supplierTodoTypeList: [1],
      page: {
        pageIndex: 2,
        pageSize: 15
      }
    }, 'searchForSemiSupplierInfo')">
        /api/kiana/mms/robin/searchForSemiSupplier
      </button>

      <div class="result">
        {{ searchForSemiSupplierInfo }}
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
import service from '@/service/request'
import ZdRadioGroup from './module/zdRadioGroup'
import ZdRadio from './module/zdRadio'

export default {
  components: {
    ZdRadioGroup,
    ZdRadio
  },

  data() {
    return {
      userInfo: null,
      activityInfo: null,
      matchInfo: null,
      searchForSemiSupplierInfo: null,
    }
  },

  computed: {
    ...mapState('user', ['headers', 'apiMode']),

    mode: {
      get() {
        return this.apiMode
      },
      set(val) {
        this.$store.commit('user/SET_API_MODE', val)
      }
    },


    mallId({ userInfo }) {
      return userInfo?.mallList?.[0]?.mallId || ''
    },

    activityType({ activityInfo }) {
      return activityInfo?.activityList?.[0]?.activityType || ''
    }
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
