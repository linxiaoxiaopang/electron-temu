<template>
  <section class="igp-card">
    <div class="igp-card-head">
      <div>
        <h2>目录配置</h2>
        <p>只选择源文件夹，输出位置自动创建在同级目录</p>
      </div>
      <span class="igp-step">01</span>
    </div>

    <div class="igp-dir" v-for="row in rows" :key="row.key">
      <div class="igp-dir-info">
        <span class="igp-dir-icon" :class="row.key">源</span>
        <div>
          <p class="igp-dir-label">{{ row.label }}</p>
          <p class="igp-dir-desc">{{ row.desc }}</p>
        </div>
      </div>
      <p class="igp-dir-path" :class="{ 'is-empty': !row.value }" :title="row.value">
        {{ row.value || row.placeholder }}
      </p>
      <button
        type="button"
        class="igp-btn igp-btn-ghost"
        :disabled="busy"
        @click="$emit('select', row.key)"
      >
        选择文件夹
      </button>
    </div>

    <p class="igp-tip">{{ outputHint }}</p>
  </section>
</template>

<script>
export default {
  name: 'DirectoryCard',

  props: {
    rows: {
      type: Array,
      required: true
    },
    busy: {
      type: Boolean,
      default: false
    },
    outputHint: {
      type: String,
      default: ''
    }
  }
}
</script>
