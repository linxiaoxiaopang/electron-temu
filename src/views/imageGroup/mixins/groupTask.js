export default {
  data() {
    return {
      sourceDir: '',
      mode: 'copy',
      keyword: '',
      imageLimit: 3,
      scanning: false,
      running: false,
      cancelRequested: false,
      preview: null,
      progress: null,
      result: null,
      error: '',
      showConfirm: false,
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
          desc: '递归扫描多层子目录，按名称归入同级 -copy / -move 文件夹，忽略 -1、-2 等序号',
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
      const modeSuffix = this.mode === 'move' ? '-move' : '-copy'
      if (!this.sourceFolderName) return `输出到与源文件夹同级的「源文件夹名${modeSuffix}」`
      return `输出到同级文件夹 ${this.sourceFolderName}${modeSuffix}`
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

    plannedCount() {
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
    mode() {
      this.resetPreview()
    },
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
          mode: this.mode,
          keyword: this.keyword
        })
        this.preview = response
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
      if (this.mode === 'move') {
        this.showConfirm = true
        return
      }
      this.runTask()
    },

    async runTask() {
      this.showConfirm = false
      if (this.running) return
      this.running = true
      this.cancelRequested = false
      this.error = ''
      this.result = null
      this.progress = { current: 0, total: this.plannedCount, groupName: '', phase: this.mode }

      try {
        const response = await this.request('imageGroup:start', {
          sourceDir: this.sourceDir,
          mode: this.mode,
          keyword: this.keyword,
          imageLimit: this.imageLimit
        })
        this.result = response
        this.progress = {
          current: response.total,
          total: response.total,
          groupName: '',
          phase: this.mode
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
      this.clearResult()
    }
  }
}
