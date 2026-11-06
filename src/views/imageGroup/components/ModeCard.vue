<template>
  <section class="igp-card">
    <div class="igp-card-head">
      <div>
        <h2>处理方式</h2>
        <p>复制模式：源文件夹只读，副本写入同级 -copy 文件夹，单张图片同样建文件夹</p>
      </div>
      <span class="igp-step">02</span>
    </div>

    <p class="igp-tip">
      images 文件夹中的图片会一并复制并按 组名-序号 命名，源文件夹内的文件不会被移动、改名或删除
    </p>

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
      <span class="igp-field-label">图片命名起始序号</span>
      <input
        type="number"
        class="igp-input"
        min="1"
        max="99"
        :value="startIndex"
        :disabled="busy"
        @change="$emit('change-start-index', $event.target.value)"
      />
      <span class="igp-field-label">默认 2，即第一张命名为 组名-2，依次递增（1-99）</span>
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
    keyword: {
      type: String,
      default: ''
    },
    imageLimit: {
      type: Number,
      default: 3
    },
    startIndex: {
      type: Number,
      default: 2
    },
    busy: {
      type: Boolean,
      default: false
    }
  }
}
</script>
