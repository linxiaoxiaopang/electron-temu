<template>
  <section class="igp-card">
    <div class="igp-progress-head">
      <span>{{ title }}</span>
      <strong>{{ percent }}%</strong>
    </div>
    <div class="igp-progress-track">
      <div
        class="igp-progress-fill"
        :class="{ 'is-running': running }"
        :style="{ width: percent + '%' }"
      ></div>
    </div>
    <div class="igp-progress-meta">
      <span>{{ progress.current }} / {{ progress.total }}</span>
      <span v-if="progress.groupName">当前分组：{{ progress.groupName }}</span>
    </div>
  </section>
</template>

<script>
export default {
  name: 'ProgressCard',

  props: {
    progress: {
      type: Object,
      required: true
    },
    percent: {
      type: Number,
      default: 0
    },
    title: {
      type: String,
      default: '正在整理'
    },
    running: {
      type: Boolean,
      default: false
    }
  }
}
</script>
