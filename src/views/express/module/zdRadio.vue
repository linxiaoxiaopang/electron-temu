<template>
  <div
    class="radio-wrapper"
    :class="{ 'is-disabled': disabled, 'is-checked': isChecked }"
    @click="handleClick"
  >
    <!-- 单选按钮图标 -->
    <div class="radio-icon">
      <div class="radio-inner" v-if="isChecked"></div>
    </div>

    <!-- 单选按钮文本 -->
    <label class="radio-label" v-if="$slots.default">
      <slot></slot>
    </label>

    <!-- 隐藏的原生input，用于表单提交 -->
    <input
      type="radio"
      class="radio-native"
      :name="name"
      :value="label"
      :checked="isChecked"
      :disabled="disabled"
      @change="handleChange"
    >
  </div>
</template>

<script>
export default {
  name: 'Radio',
  inject: ['radioGroup'],
  props: {
    // 绑定的值
    value: {
      type: [String, Number, Boolean],
      default: ''
    },
    // 选项值
    label: {
      type: [String, Number, Boolean],
      required: true
    },
    // 单选按钮组名称
    name: {
      type: String,
      default: ''
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    // 判断当前选项是否被选中
    isChecked() {
      return this.value === this.label
    }
  },
  methods: {
    // 处理点击事件
    handleClick() {
      if (this.disabled) return
      this.$emit('input', this.label)
      this.$emit('change', this.label)
      this.$parent?.$emit('radioChange', this.label)
    },
    // 处理原生input变化事件
    handleChange(e) {
      this.$emit('change', e.target.value)
    }
  }
}
</script>

<style scoped>
.radio-wrapper {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    vertical-align: middle;
    margin-right: 16px;
    user-select: none;
}

/* 单选按钮样式 */
.radio-icon {
    position: relative;
    width: 16px;
    height: 16px;
    border: 1px solid #dcdfe6;
    border-radius: 50%;
    box-sizing: border-box;
    transition: all 0.2s ease;
}

/* 选中状态的内部圆点 */
.radio-inner {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #409eff;
    transition: all 0.2s ease;
}

/* 标签样式 */
.radio-label {
    margin-left: 8px;
    color: #606266;
    font-size: 14px;
}

/* 原生input隐藏 */
.radio-native {
    position: absolute;
    width: 0;
    height: 0;
    opacity: 0;
    margin: 0;
}

/* 选中状态样式 */
.is-checked .radio-icon {
    border-color: #409eff;
    background-color: #fff;
}

/* 禁用状态样式 */
.is-disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.is-disabled .radio-icon {
    border-color: #c0c4cc;
}

.is-disabled .radio-label {
    color: #c0c4cc;
}

/* hover状态 */
.radio-wrapper:not(.is-disabled):hover .radio-icon {
    border-color: #409eff;
}
</style>
