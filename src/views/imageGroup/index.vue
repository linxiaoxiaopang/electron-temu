<template>
  <div class="igp">
    <header class="igp-header">
      <div class="igp-header-inner">
        <div class="igp-brand">
          <span class="igp-logo">图</span>
          <div>
            <h1>图片按名称分组</h1>
            <p>递归扫描并按名称分组，审核第一组的顺序与删减后套用到所有分组，统一命名为 组名-{{ startIndex }}、组名-{{ startIndex + 1 }}…</p>
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
        :keyword="keyword"
        :image-limit="imageLimit"
        :start-index="startIndex"
        :busy="busy"
        @change-keyword="keyword = $event"
        @change-image-limit="updateImageLimit"
        @change-start-index="updateStartIndex"
      />

      <PreviewCard
        v-if="preview"
        :preview="preview"
        :planned-count="plannedCount"
        :show-all-groups="showAllGroups"
        :keyword="keyword"
        :image-limit="imageLimit"
        :start-index="startIndex"
        @toggle-all="showAllGroups = !showAllGroups"
      />

      <ReviewCard
        v-if="review.active && currentReviewGroup && !running && !result"
        :group="currentReviewGroup"
        :group-count="reviewTotal"
        :file-limit="(preview && preview.fileLimit) || 30"
        :start-index="startIndex"
        :truncated="Boolean(currentReviewGroup.truncated)"
        :busy="busy"
        @move="moveFile"
        @shift="shiftFile"
        @toggle-remove="toggleRemove"
        @reset="resetGroup"
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
          <button
            type="button"
            class="igp-btn igp-btn-ghost"
            v-if="review.active && !running && !result"
            @click="skipReview"
          >
            跳过审核
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

  </div>
</template>

<script>
import DirectoryCard from './components/DirectoryCard.vue'
import ModeCard from './components/ModeCard.vue'
import PreviewCard from './components/PreviewCard.vue'
import ReviewCard from './components/ReviewCard.vue'
import ProgressCard from './components/ProgressCard.vue'
import ResultCard from './components/ResultCard.vue'
import groupTask from './mixins/groupTask'

export default {
  name: 'ImageGroup',

  components: {
    DirectoryCard,
    ModeCard,
    PreviewCard,
    ReviewCard,
    ProgressCard,
    ResultCard
  },

  mixins: [groupTask]
}
</script>

<style src="./style.css"></style>
