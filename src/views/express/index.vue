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
       未获取到temu的请求头，请刷新temu页面
     </span>
      <span v-else>
        <div>获取请求头成功</div>
      </span>
    </div>

    <ApiItem url="/temu-agentseller/api/seller/auth/userInfo" :params="{}" v-model="userInfo"/>

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


    <ApiItem url="/temu-agentseller/api/verifyPrice/updateCreatePricingStrategy" :params="{
      mallId,
      strategyList
    }"/>


    <ApiItem label="interval 10s " url="/temu-agentseller/api/verifyPrice/setPricingConfigAndStartPricing" :params="{
      mallId,
      interval: 10000,
      autoplay: true
    }"/>

    <ApiItem label="interval最大值" url="/temu-agentseller/api/verifyPrice/setPricingConfigAndStartPricing" :params="{
      mallId,
      interval: 2147483647,
      autoplay: true
    }"/>


    <ApiItem label="autoplay = false " url="/temu-agentseller/api/verifyPrice/setPricingConfigAndStartPricing" :params="{
      mallId,
      autoplay: false
    }"/>

    <ApiItem url="/temu-agentseller/api/verifyPrice/getPricingConfigAndStartPricing" :params="{
     mallId
    }"/>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import service from '@/service/request'
import ZdRadioGroup from './module/zdRadioGroup'
import ZdRadio from './module/zdRadio'
import ApiItem from './module/apiItem'

export default {
  components: {
    ZdRadioGroup,
    ZdRadio,
    ApiItem
  },

  data() {
    return {
      userInfo: null,
      activityInfo: null,
      strategyList: [
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 41148871409,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 99375607851,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 51386885553,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 62245754922,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 46746898427,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 27093873543,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 41208366102,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 58557729532,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 33543928932,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 40122160278,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 42834665447,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 51546430786,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 47598722994,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 11042185248,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 63241273325,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 58782012264,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 60360576300,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 67075794823,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 46682732208,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 78640801809,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 53473834996,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 96469701686,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 77736358285,
          maxCost: 10800
        },
        {
          priceOrderId: 2508271406178845,
          maxPricingNumber: 10,
          mallId: 634418220722031,
          skuId: 47504645561,
          maxCost: 10800
        }
      ],
      pricingStrategy: null
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
    },

    skuIdList({ strategyList }) {
      return strategyList.map(item => item.skuId)
    }
  }
}

</script>

<style scoped>
</style>
