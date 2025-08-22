<template>
  <div class="radio-group" :class="{ 'vertical': vertical }">
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'RadioGroup',
  componentName: 'RadioGroup',
  props: {
    // 绑定的值
    value: {
      type: [String, Number, Boolean],
      default: ''
    },
    // 单选按钮组名称
    name: {
      type: String,
      default: ''
    },
    // 是否垂直排列
    vertical: {
      type: Boolean,
      default: false
    },
    // 是否禁用整个组
    disabled: {
      type: Boolean,
      default: false
    }
  },
  watch: {
    value(newVal) {
      this.$emit('input', newVal);
      this.$emit('change', newVal);
    }
  },
  mounted() {
    // 监听子组件的change事件
    this.$on('radioChange', value => {
      this.$emit('input', value);
      this.$emit('change', value);
    })
  },
  provide() {
    // 向子组件提供组的上下文
    return {
      radioGroup: this
    }
  }
}
</script>

<style scoped>
.radio-group {
    display: inline-block;
}

/* 垂直排列样式 */
.vertical {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.vertical .radio-wrapper {
    margin-right: 0;
}
</style>
