<template>
  <div class="api-item-component">
    <div class="btn" @click="onClick">
      点击{{ label }}{{ url }}
    </div>
    <div class="result">
      {{ data }}
    </div>
  </div>
</template>

<script>
import service from '@/service/request'

export default {
  props: {
    url: {
      type: String,
      required: true
    },

    label: String,

    params: {
      type: Object,
      required: true
    }
  },

  data() {
    return {
      data: null
    }
  },

  methods: {
    async onClick() {
      const { url, params } = this
      const res = await service({
        url,
        data: params,
        method: 'post'
      })
      this.data = res?.data?.data
      this.$emit('input', this.data)
    }
  }
}

</script>

<style lang="css" scoped>
.btn {
    display: inline-block;
    padding: 10px;
    border: 1px solid #eee;
    border-bottom: none;
    cursor: pointer;
}

.result {
    padding: 10px;
    border: 1px solid #eee;
    margin-bottom: 10px;
    max-height: 150px;
    overflow: auto;
}
</style>
