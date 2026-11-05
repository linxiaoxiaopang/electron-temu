<template>
  <div class="igp">
    <header class="igp-header">
      <div class="igp-header-inner">
        <div class="igp-brand">
          <span class="igp-logo">图</span>
          <div>
            <h1>图片按名称分组</h1>
            <p>递归扫描源文件夹，按名称生成文件夹，忽略 -1、-2 等序号，图片名称保持不变</p>
          </div>
        </div>
        <span class="igp-badge" :class="'is-' + statusKey">{{ statusText }}</span>
      </div>
    </header>

    <main class="igp-main">
      <DirectoryCard
        :rows="directoryRows"
        :busy="busy"
        :output-hint="outputHint"
        @select="selectDirectory"
      />

      <ModeCard
        :mode="mode"
        :keyword="keyword"
        :image-limit="imageLimit"
        :busy="busy"
        @change-mode="mode = $event"
        @change-keyword="keyword = $event"
        @change-image-limit="updateImageLimit"
      />

      <PreviewCard
        v-if="preview"
        :preview="preview"
        :planned-count="plannedCount"
        :show-all-groups="showAllGroups"
        :keyword="keyword"
        :image-limit="imageLimit"
        @toggle-all="showAllGroups = !showAllGroups"
      />

      <ProgressCard
        v-if="progress"
        :progress="progress"
        :percent="progressPercent"
        :title="progressTitle"
        :running="running"
      />

      <ResultCard v-if="result" :result="result" />

      <div class="igp-actions">
        <p class="igp-error" v-if="error">{{ error }}</p>
        <div class="igp-action-btns">
          <button
            type="button"
            class="igp-btn igp-btn-ghost"
            v-if="result && !running"
            @click="resetPreview"
          >
            重新开始
          </button>
          <button
            type="button"
            class="igp-btn igp-btn-ghost"
            v-if="preview && !running"
            @click="resetPreview"
          >
            重新扫描
          </button>
          <button type="button" class="igp-btn igp-btn-primary" v-if="running" @click="cancel">
            {{ cancelRequested ? '正在取消…' : '取消整理' }}
          </button>
          <button
            type="button"
            class="igp-btn igp-btn-primary"
            v-else-if="!preview"
            :disabled="!ready || scanning"
            @click="scan"
          >
            {{ scanning ? '扫描中…' : '扫描预览' }}
          </button>
          <button
            type="button"
            class="igp-btn igp-btn-primary"
            v-else
            :disabled="!plannedCount"
            @click="start"
          >
            开始整理
          </button>
        </div>
      </div>
    </main>

    <div class="igp-modal-mask" v-if="showConfirm">
      <div class="igp-modal">
        <h3>确认使用移动模式？</h3>
        <p>移动会把原图片移入同级 -move 文件夹，操作不可撤销。建议先用复制模式验证分组结果。</p>
        <div class="igp-modal-actions">
          <button type="button" class="igp-btn igp-btn-ghost" @click="showConfirm = false">
            再想想
          </button>
          <button type="button" class="igp-btn igp-btn-primary" @click="runTask">确认移动</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DirectoryCard from './components/DirectoryCard.vue'
import ModeCard from './components/ModeCard.vue'
import PreviewCard from './components/PreviewCard.vue'
import ProgressCard from './components/ProgressCard.vue'
import ResultCard from './components/ResultCard.vue'
import groupTask from './mixins/groupTask'

export default {
  name: 'ImageGroup',

  components: {
    DirectoryCard,
    ModeCard,
    PreviewCard,
    ProgressCard,
    ResultCard
  },

  mixins: [groupTask]
}
</script>

<style src="./style.css"></style>
