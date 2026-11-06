<template>
  <section class="igp-card igp-review">
    <div class="igp-card-head">
      <div>
        <h2>审核第一组</h2>
        <p>拖拽或使用箭头调整顺序，序号即最终命名（组名-1、组名-2…）</p>
      </div>
      <span class="igp-step">04</span>
    </div>

    <div class="igp-review-head">
      <div class="igp-review-name">
        <span class="igp-review-label">模板分组 · 其余分组按此顺序与删减处理</span>
        <strong :title="group.name">{{ group.name }}</strong>
      </div>
      <div class="igp-review-counts">
        <span class="igp-review-badge">共 {{ groupCount }} 组</span>
        <span class="igp-review-kept">本组保留 {{ kept }} 张</span>
        <span class="igp-review-removed" v-if="removed">本组删减 {{ removed }} 张</span>
      </div>
    </div>

    <p class="igp-tip" v-if="truncated">
      本组图片超过 {{ fileLimit }} 张，仅展示前 {{ fileLimit }} 张，其余按原顺序排在后面
    </p>

    <ul class="igp-review-grid" v-if="group.files.length">
      <li
        v-for="(file, i) in group.files"
        :key="file.path"
        class="igp-review-item"
        :class="{
          'is-removed': file.removed,
          'is-dragging': dragIndex === i,
          'is-drop-target': dropIndex === i && dragIndex !== null && dragIndex !== i
        }"
        :draggable="!file.removed && !busy"
        @dragstart="onDragStart(i, $event)"
        @dragover="onDragOver(i, $event)"
        @dragleave="onDragLeave(i)"
        @drop="onDrop(i, $event)"
        @dragend="onDragEnd"
      >
        <div class="igp-review-thumb">
          <img
            v-if="!brokenMap[file.path]"
            :src="file.fileUrl"
            :alt="file.name"
            draggable="false"
            loading="lazy"
            decoding="async"
            @error="markBroken(file)"
          />
          <span class="igp-review-broken" v-else>{{ file.ext.replace('.', '').toUpperCase() || 'IMG' }}</span>
          <span class="igp-review-order">{{ i + 1 }}</span>
          <span class="igp-review-grip" aria-hidden="true">⠿</span>
        </div>

        <p class="igp-review-file" :title="file.name">{{ file.name }}</p>

        <div class="igp-review-ops" v-if="!file.removed">
          <button
            type="button"
            class="igp-review-op"
            title="上移"
            :disabled="i === 0 || busy"
            @click="$emit('shift', { index: i, delta: -1 })"
          >↑</button>
          <button
            type="button"
            class="igp-review-op"
            title="下移"
            :disabled="i === group.files.length - 1 || busy"
            @click="$emit('shift', { index: i, delta: 1 })"
          >↓</button>
          <button
            type="button"
            class="igp-review-op is-danger"
            :disabled="busy"
            @click="$emit('toggle-remove', i)"
          >删减</button>
        </div>

        <button
          type="button"
          class="igp-review-undo"
          v-else
          :disabled="busy"
          @click="$emit('toggle-remove', i)"
        >撤销删减</button>
      </li>
    </ul>

    <p class="igp-tip" v-else>本组没有可审核的图片。</p>

    <div class="igp-review-nav">
      <p class="igp-review-apply">
        其余 {{ Math.max(groupCount - 1, 0) }} 个分组按相同位置重排与删减，多出的图片保留在末尾
      </p>
      <button type="button" class="igp-link" :disabled="busy" @click="$emit('reset')">
        恢复默认
      </button>
    </div>
  </section>
</template>

<script>
export default {
  name: 'ReviewCard',

  props: {
    group: {
      type: Object,
      required: true
    },
    groupCount: {
      type: Number,
      default: 1
    },
    fileLimit: {
      type: Number,
      default: 30
    },
    truncated: {
      type: Boolean,
      default: false
    },
    busy: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      dragIndex: null,
      dropIndex: null,
      brokenMap: {}
    }
  },

  computed: {
    kept() {
      return this.group.files.filter(file => !file.removed).length
    },

    removed() {
      return this.group.files.length - this.kept
    }
  },

  methods: {
    markBroken(file) {
      this.$set(this.brokenMap, file.path, true)
    },

    onDragStart(index, event) {
      this.dragIndex = index
      this.dropIndex = index
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', String(index))
      }
    },

    onDragOver(index, event) {
      if (this.dragIndex === null) return
      // 必须阻止默认行为，否则浏览器不会触发 drop
      if (event.preventDefault) event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
      this.dropIndex = index
    },

    onDragLeave(index) {
      if (this.dropIndex === index) this.dropIndex = null
    },

    onDrop(index, event) {
      if (event && event.preventDefault) event.preventDefault()
      const from = this.dragIndex
      this.onDragEnd()
      if (from === null || from === index) return
      this.$emit('move', { from, to: index })
    },

    onDragEnd() {
      this.dragIndex = null
      this.dropIndex = null
    }
  }
}
</script>
