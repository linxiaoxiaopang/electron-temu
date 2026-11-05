<template>
  <section class="igp-card">
    <div class="igp-card-head">
      <div>
        <h2>扫描预览</h2>
        <p>确认分组结果后再执行归档</p>
      </div>
      <span class="igp-step">03</span>
    </div>

    <div class="igp-metrics">
      <div class="igp-metric">
        <span>图片总数</span>
        <strong>{{ preview.total }}</strong>
      </div>
      <div class="igp-metric">
        <span>文件夹数</span>
        <strong>{{ preview.folderCount }}</strong>
      </div>
      <div class="igp-metric is-primary">
        <span>本次归档</span>
        <strong>{{ plannedCount }}</strong>
      </div>
      <div class="igp-metric is-muted" v-if="preview.organizedSkipped">
        <span>已整理跳过</span>
        <strong>{{ preview.organizedSkipped }}</strong>
      </div>
    </div>

    <p class="igp-tip" v-if="keyword.trim()">
      已忽略名称中的「{{ keyword.trim() }}」及结尾的 -1、-2 等序号，图片名称保持不变
    </p>

    <p class="igp-tip" v-if="preview.groups.length">
      归档完成后会在输出目录生成「图片与标题.xlsx」，包含图片名称、AI描述词（留空）和图片三列，每个文件夹插入前 {{ imageLimit }} 张图片
    </p>

    <p class="igp-tip" v-if="preview.outputExists">
      目标文件夹已存在：{{ preview.outputDir }}，重名文件将追加 _1、_2 序号，不会覆盖
    </p>

    <div class="igp-groups" v-if="preview.groups.length">
      <div class="igp-groups-head">
        <span>将生成的文件夹</span>
        <button
          type="button"
          class="igp-link"
          v-if="preview.groups.length > 8"
          @click="$emit('toggle-all')"
        >
          {{ showAllGroups ? '收起' : '展开全部' }}
        </button>
      </div>
      <div class="igp-tags">
        <span class="igp-tag" v-for="group in visibleGroups" :key="group.name">
          {{ group.name }} <em>×{{ group.count }}</em>
        </span>
        <span class="igp-tag is-more" v-if="preview.groupsTruncated">仅展示前 200 个</span>
      </div>
    </div>
    <p class="igp-tip" v-else>没有找到可整理的图片。</p>
  </section>
</template>

<script>
export default {
  name: 'PreviewCard',

  props: {
    preview: {
      type: Object,
      required: true
    },
    plannedCount: {
      type: Number,
      default: 0
    },
    showAllGroups: {
      type: Boolean,
      default: false
    },
    keyword: {
      type: String,
      default: ''
    },
    imageLimit: {
      type: Number,
      default: 3
    }
  },

  computed: {
    visibleGroups() {
      if (this.showAllGroups) return this.preview.groups
      return this.preview.groups.slice(0, 8)
    }
  }
}
</script>
