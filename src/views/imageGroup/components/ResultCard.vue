<template>
  <section class="igp-card">
    <div class="igp-card-head">
      <div>
        <h2>整理结果</h2>
        <p>{{ result.cancelled ? '任务已取消，已写入的文件不会回滚' : '同级目录下已生成同名分组文件夹' }}</p>
      </div>
      <span class="igp-step">04</span>
    </div>

    <div class="igp-metrics">
      <div class="igp-metric">
        <span>归档分组</span>
        <strong>{{ result.groups }}</strong>
      </div>
      <div class="igp-metric is-success">
        <span>成功文件</span>
        <strong>{{ result.success }}</strong>
      </div>
      <div class="igp-metric is-danger">
        <span>失败文件</span>
        <strong>{{ result.failed }}</strong>
      </div>
    </div>

    <p class="igp-done" v-if="!result.failed && !result.cancelled">
      全部完成，文件已归档到同级文件夹。
    </p>

    <p class="igp-tip" v-if="result.outputDir">输出位置：{{ result.outputDir }}</p>

    <p class="igp-tip" v-if="result.excelPath">已生成表格：{{ result.excelPath }}</p>

    <p class="igp-tip" v-if="result.excelError">表格生成失败：{{ result.excelError }}</p>

    <p class="igp-tip" v-if="result.organizedSkipped">
      已跳过 {{ result.organizedSkipped }} 张位于同名文件夹内的图片
    </p>

    <div class="igp-failures" v-if="result.failures.length">
      <div class="igp-groups-head">
        <span>失败明细</span>
        <em>{{ result.failed }} 项</em>
      </div>
      <ul>
        <li v-for="(failure, index) in result.failures" :key="index">
          <span class="igp-failure-path" :title="failure.path">{{ failure.path }}</span>
          <span class="igp-failure-msg">{{ failure.message }}</span>
        </li>
      </ul>
      <p class="igp-tip" v-if="result.failuresTruncated">
        失败明细仅展示前 {{ result.failures.length }} 项
      </p>
    </div>
  </section>
</template>

<script>
export default {
  name: 'ResultCard',

  props: {
    result: {
      type: Object,
      required: true
    }
  }
}
</script>
