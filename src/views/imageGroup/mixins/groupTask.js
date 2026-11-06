export default {
  data() {
    return {
      sourceDir: '',
      keyword: '',
      imageLimit: 3,
      startIndex: 2,
      scanning: false,
      running: false,
      cancelRequested: false,
      preview: null,
      review: {
        active: false,
        groups: []
      },
      progress: null,
      result: null,
      error: '',
      showAllGroups: false
    }
  },

  computed: {
    ready() {
      return Boolean(this.sourceDir)
    },

    busy() {
      return this.scanning || this.running
    },

    directoryRows() {
      return [
        {
          key: 'source',
          label: '源图片文件夹',
          desc: '递归扫描多层子目录，按名称归入同级 -copy 文件夹，忽略 -1、-2 等序号',
          value: this.sourceDir,
          placeholder: '尚未选择源文件夹'
        }
      ]
    },

    sourceFolderName() {
      const parts = String(this.sourceDir).split(/[\\/]/).filter(Boolean)
      return parts.length ? parts[parts.length - 1] : ''
    },

    outputHint() {
      if (this.preview && this.preview.outputDir) {
        const suffix = this.preview.outputExists ? '（已存在，将复用）' : '（将自动创建）'
        return `输出到 ${this.preview.outputDir}${suffix}`
      }
      if (!this.sourceFolderName) return '输出到与源文件夹同级的「源文件夹名-copy」'
      return `输出到同级文件夹 ${this.sourceFolderName}-copy`
    },

    statusKey() {
      if (this.running) return 'running'
      if (this.result) return 'done'
      if (this.preview) return 'ready'
      if (this.ready) return 'configured'
      return 'idle'
    },

    statusText() {
      const textMap = {
        running: '执行中',
        done: '已完成',
        ready: '待执行',
        configured: '已配置',
        idle: '待配置'
      }
      return textMap[this.statusKey]
    },

    // 审核只展示第一组，其顺序与删减作为模板套用到所有分组
    currentReviewGroup() {
      return this.review.groups[0] || null
    },

    reviewTotal() {
      return this.review.groups.length
    },

    reviewKeptCount() {
      return this.review.groups.reduce((sum, group) => sum + this.applyTemplate(group).length, 0)
    },

    plannedCount() {
      if (this.review.active) return this.reviewKeptCount
      return this.preview ? this.preview.plannedFiles : 0
    },

    progressPercent() {
      if (!this.progress) return 0
      if (!this.progress.total) return this.result ? 100 : 0
      return Math.min(100, Math.round((this.progress.current / this.progress.total) * 100))
    },

    progressTitle() {
      if (this.running) return this.cancelRequested ? '正在取消…' : '正在整理'
      if (this.result && this.result.cancelled) return '已取消'
      return '整理完成'
    }
  },

  watch: {
    keyword() {
      this.resetPreview()
    }
  },

  mounted() {
    if (this.hasBridge()) {
      window.electronAPI.on('imageGroup:progress', this.handleProgress)
    }
  },

  beforeDestroy() {
    if (this.hasBridge()) {
      window.electronAPI.off('imageGroup:progress')
    }
  },

  methods: {
    hasBridge() {
      return Boolean(window.electronAPI && typeof window.electronAPI.invoke === 'function')
    },

    async request(channel, payload) {
      if (!this.hasBridge()) {
        throw new Error('当前环境无法访问文件系统，请在桌面客户端中使用该功能')
      }
      const response = await window.electronAPI.invoke(channel, payload)
      if (!response) throw new Error('主进程未返回结果')
      if (response.error) throw new Error(response.error)
      return response
    },

    // 审核数据来自扫描结果：组内按 -1、-2 自然排序，默认为全部保留
    enterReview(preview) {
      const groups = (preview.groups || [])
        .filter(group => Array.isArray(group.files) && group.files.length)
        .map(group => {
          const files = group.files.map(file => ({ ...file, removed: false }))
          return {
            name: group.name,
            count: group.count,
            truncated: group.files.length < group.count,
            files,
            defaults: files.map(file => ({ ...file }))
          }
        })

      this.review = { active: groups.length > 0, groups }
    },

    skipReview() {
      this.review.active = false
    },

    moveFile({ from, to }) {
      const group = this.currentReviewGroup
      if (!group || from === to) return
      if (from < 0 || to < 0 || from >= group.files.length || to >= group.files.length) return
      const [item] = group.files.splice(from, 1)
      group.files.splice(to, 0, item)
    },

    shiftFile({ index, delta }) {
      this.moveFile({ from: index, to: index + delta })
    },

    toggleRemove(index) {
      const group = this.currentReviewGroup
      if (!group) return
      const file = group.files[index]
      if (!file) return
      file.removed = !file.removed
    },

    resetGroup() {
      const group = this.currentReviewGroup
      if (!group) return
      group.files = group.defaults.map(file => ({ ...file }))
    },

    // 把第一组的顺序与删减套用到某个分组：按相同位置重排，多出的图片保留在末尾
    applyTemplate(group) {
      const template = this.review.groups[0]
      if (!template || group === template) {
        return group.files.filter(file => !file.removed)
      }

      const position = new Map(template.defaults.map((file, index) => [file.path, index]))
      const order = template.files.map(file => position.get(file.path))
      const removed = new Set(
        template.files.filter(file => file.removed).map(file => position.get(file.path))
      )

      const result = []
      order.forEach(index => {
        if (removed.has(index) || index >= group.files.length) return
        result.push(group.files[index])
      })
      for (let index = template.defaults.length; index < group.files.length; index += 1) {
        result.push(group.files[index])
      }
      return result
    },

    // 提交给主进程的审核计划：顺序即最终命名顺序，removed 的图片不参与归档
    buildPlan() {
      return this.review.groups.map(group => ({
        name: group.name,
        count: group.count,
        truncated: group.truncated,
        files: this.applyTemplate(group).map(file => file.path)
      }))
    },

    async selectDirectory() {
      if (this.busy) return
      this.error = ''
      try {
        const response = await this.request('imageGroup:selectDirectory', {
          title: '选择图片源文件夹'
        })
        if (response.cancelled) return
        this.sourceDir = response.path
        this.resetPreview()
      } catch (error) {
        this.error = error.message
      }
    },

    async scan() {
      if (!this.ready || this.busy) return
      this.scanning = true
      this.clearResult()
      try {
        const response = await this.request('imageGroup:scan', {
          sourceDir: this.sourceDir,
          keyword: this.keyword
        })
        this.preview = response
        this.enterReview(response)
        if (!response.total) {
          const skipped = response.organizedSkipped || 0
          this.error = skipped
            ? `没有待整理的图片，已跳过 ${skipped} 张已整理图片`
            : '所选源文件夹中没有找到待整理的图片'
        }
      } catch (error) {
        this.error = error.message
        this.preview = null
      } finally {
        this.scanning = false
      }
    },

    start() {
      if (!this.preview || this.busy || !this.plannedCount) return
      this.runTask()
    },

    async runTask() {
      if (this.running) return
      this.running = true
      this.cancelRequested = false
      this.error = ''
      this.result = null
      this.progress = { current: 0, total: this.plannedCount, groupName: '', phase: 'copy' }

      try {
        const payload = {
          sourceDir: this.sourceDir,
          keyword: this.keyword,
          imageLimit: this.imageLimit,
          startIndex: this.startIndex
        }
        if (this.review.active) payload.plan = this.buildPlan()
        const response = await this.request('imageGroup:start', payload)
        this.result = response
        this.progress = {
          current: response.total,
          total: response.total,
          groupName: '',
          phase: 'copy'
        }
      } catch (error) {
        this.error = error.message
        this.progress = null
      } finally {
        this.running = false
      }
    },

    // 表格图片张数：1-50，非法输入回落到默认值
    updateImageLimit(value) {
      const limit = Math.floor(Number(value))
      if (!Number.isFinite(limit) || limit < 1) {
        this.imageLimit = 3
        return
      }
      this.imageLimit = Math.min(limit, 50)
    },

    // 归档起始序号：1-99，非法输入回落到默认值 2
    updateStartIndex(value) {
      const index = Math.floor(Number(value))
      if (!Number.isFinite(index) || index < 1) {
        this.startIndex = 2
        return
      }
      this.startIndex = Math.min(index, 99)
    },

    async cancel() {
      if (!this.running || this.cancelRequested) return
      this.cancelRequested = true
      try {
        await this.request('imageGroup:cancel')
      } catch (error) {
        this.error = error.message
      }
    },

    handleProgress(payload) {
      if (!payload) return
      this.progress = payload
    },

    clearResult() {
      if (this.running) return
      this.result = null
      this.progress = null
      this.error = ''
      this.cancelRequested = false
    },

    resetPreview() {
      if (this.running) return
      this.preview = null
      this.showAllGroups = false
      this.review = { active: false, groups: [] }
      this.clearResult()
    }
  }
}
