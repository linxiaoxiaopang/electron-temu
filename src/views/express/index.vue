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
      <span v-else>
       <div>店铺名称：{{ realUserInfo.mallName }}</div>
       <div>店铺id：{{ realUserInfo.mallId }}</div>
       <div>店铺类型：{{ realUserInfo.managedType }}</div>
      </span>
    </div>

    <ApiItem
      url="/temu-agentseller/api/kiana/gamblers/marketing/enroll/activity/list"
      :params="{
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
       }"
      v-model="activityInfo"
    />

    <ApiItem url="/temu-agentseller/api/kiana/gamblers/marketing/enroll/scroll/match" :params="{
      mallId,
      activityType,
      rowCount: 50
    }"/>

    <ApiItem url="/temu-agentseller/api/kiana/mms/robin/searchForSemiSupplier" :params="{
      mallId,
      supplierTodoTypeList: [1],
      page: {
        pageIndex: 2,
        pageSize: 15
      }
    }"/>

    <ApiItem url="/temu-agentseller/api/verifyPrice/getPricingStrategy" :params="{
      mallId,
      skuIdList
    }"/>


    <ApiItem url="/temu-agentseller/api/verifyPrice/getPricingStrategyHistory" :params="{
      mallId,
      page: {
        pageIndex: 1,
        pageSize: 10
      }
    }"/>

    <ApiItem url="/temu-agentseller/api/verifyPrice/updateCreatePricingStrategy" :params="{
      mallId,
      strategyList
    }"/>


    <ApiItem label="interval 10s " url="/temu-agentseller/api/verifyPrice/setPricingConfig" :params="{
      mallId,
      interval: 10000,
      autoplay: true
    }"/>

    <ApiItem label="interval最大值" url="/temu-agentseller/api/verifyPrice/setPricingConfig" :params="{
      mallId,
      interval: 2147483647,
      autoplay: true
    }"/>


    <ApiItem label="autoplay = false " url="/temu-agentseller/api/verifyPrice/setPricingConfig" :params="{
      mallId,
      autoplay: false,
      processing: 0
    }"/>

    <ApiItem url="/temu-agentseller/api/verifyPrice/getPricingConfig" :params="{
     mallId
    }"/>

    <ApiItem url="/temu-agentseller/api/verifyPrice/getPricingConfigHistory" :params="{
     mallId
    }"/>

    <ApiItem url="/temu-agentseller/api/verifyPrice/getPricingConfigHistory" :params="{
     mallId,
     page: {
       pageIndex: 1,
       pageSize: 10
     }
    }"/>

    <ApiItem url="/temu-agentseller/api/verifyPrice/getSearchForChainSupplier" :params="{
     mallId,
     page: {
       pageIndex: 1,
       pageSize: 20
     }
    }"/>

    <ApiItem url="/temu-agentseller/api/verifyPrice/syncSearchForChainSupplier" :params="{
     mallId
    }"/>

    <ApiItem url="/temu-agentseller/api/verifyPrice/getSyncSearchForChainSupplier" :params="{
     mallId,
      page: {
       pageIndex: 1,
       pageSize: 10
     }
    }"/>

    <ApiItem url="/temu-agentseller/api/verifyPrice/getSyncSearchForChainSupplierMinSuggestSupplyPrice" :params="{
     mallId
    }"/>



<!--    <ApiItem url="/temu-agentseller/api/verifyPrice/updateCreatePricingStrategyPassSetting" :params="{-->
<!--     mallId,-->
<!--    }"/>-->

<!--    <ApiItem url="/temu-agentseller/api/verifyPrice/validatePricingStrategy" :params="{-->
<!--     mallId,-->
<!--     extCodeLike: 'MSJK2-T001251_00004'-->
<!--    }"/>-->

  </div>
</template>

<script>
import { mapState } from 'vuex'
import ZdRadioGroup from './module/zdRadioGroup'
import ZdRadio from './module/zdRadio'
import ApiItem from './module/apiItem'
import updateJson from './update.json'
export default {
  components: {
    ZdRadioGroup,
    ZdRadio,
    ApiItem
  },

  data() {
    return {
      activityInfo: null,
      strategyList: updateJson.strategyList[0],
      pricingStrategy: null
    }
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
    },

    mallId({ headers }) {
      return headers?.mallid || ''
    },

    activityType({ activityInfo }) {
      return activityInfo?.activityList?.[0]?.activityType || ''
    },

    skuIdList({ strategyList }) {
      return strategyList.map(item => item.skuId)
    }
  }
}

</script>

<style scoped>
</style>
