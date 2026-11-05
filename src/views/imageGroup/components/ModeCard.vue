<template>
  <section class="igp-card">
    <div class="igp-card-head">
      <div>
        <h2>处理方式</h2>
        <p>每张图片都会归入对应名称的文件夹，单张同样建文件夹</p>
      </div>
      <span class="igp-step">02</span>
    </div>

    <div class="igp-modes">
      <button
        type="button"
        class="igp-mode"
        :class="{ 'is-active': mode === 'copy' }"
        :disabled="busy"
        @click="$emit('change-mode', 'copy')"
      >
        <span class="igp-mode-icon">⧉</span>
        <span class="igp-mode-body">
          <strong>复制</strong>
          <em>原图保留，副本放入同级 -copy 文件夹</em>
        </span>
        <span class="igp-radio"></span>
      </button>
      <button
        type="button"
        class="igp-mode"
        :class="{ 'is-active': mode === 'move' }"
        :disabled="busy"
        @click="$emit('change-mode', 'move')"
      >
        <span class="igp-mode-icon">↦</span>
        <span class="igp-mode-body">
          <strong>移动</strong>
          <em>原图移入同级 -move 文件夹，不可撤销</em>
        </span>
        <span class="igp-radio"></span>
      </button>
    </div>

    <label class="igp-field">
      <span class="igp-field-label">删除名称中的关键词（可选）</span>
      <input
        type="text"
        class="igp-input"
        :value="keyword"
        :disabled="busy"
        placeholder="例如输入 bcd，abcd-1.jpg 会归入 a 文件夹"
        @input="$emit('change-keyword', $event.target.value)"
      />
      <span class="igp-field-label">结尾的 -1、-2 等序号会自动忽略，图片名称保持不变</span>
    </label>

    <label class="igp-field">
      <span class="igp-field-label">表格中每个文件夹插入的图片数</span>
      <input
        type="number"
        class="igp-input"
        min="1"
        max="50"
        :value="imageLimit"
        :disabled="busy"
        @change="$emit('change-image-limit', $event.target.value)"
      />
      <span class="igp-field-label">默认 3 张，按文件名顺序取前几张（1-50）</span>
    </label>

    <p class="igp-format">
      识别格式：jpg / jpeg / png / webp / gif / bmp / svg / avif / heic / tiff / ico
    </p>
  </section>
</template>

<script>
export default {
  name: 'ModeCard',

  props: {
    mode: {
      type: String,
      default: 'copy'
    },
    keyword: {
      type: String,
      default: ''
    },
    imageLimit: {
      type: Number,
      default: 3
    },
    busy: {
      type: Boolean,
      default: false
    }
  }
}
</script>
