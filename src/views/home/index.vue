<template>
  <div class="node-usage">
    <h3>Node.js 功能演示</h3>

    <div class="info-section">
      <h4>系统信息</h4>
      <p>操作系统: {{ osInfo.platform }}</p>
      <p>系统版本: {{ osInfo.version }}</p>
      <p>CPU 核心数: {{ osInfo.cpus }}</p>
    </div>

    <div class="file-section">
      <h4>文件操作</h4>
      <button @click="readSampleFile">读取示例文件</button>
      <button @click="writeSampleFile">写入示例文件</button>

      <div v-if="fileContent" class="file-content">
        <h5>文件内容:</h5>
        <pre>{{ fileContent }}</pre>
      </div>

      <div v-if="fileMessage">
        {{ fileMessage.text }}
      </div>
    </div>
  </div>
</template>

<script>
// 在 Vue 组件中引入 Node 模块（使用 window.require）
const fs = window.require('fs')
const path = window.require('path')
const os = window.require('os')

export default {
  name: 'NodeUsage',
  data() {
    return {
      osInfo: {},
      fileContent: '',
      fileMessage: null
    }
  },
  mounted() {
    // 获取系统信息（使用 os 模块）
    this.osInfo = {
      platform: os.platform(),
      version: os.version(),
      cpus: os.cpus().length
    }
  },
  methods: {
    // 读取文件（使用 fs 模块）
    readSampleFile() {
      // 示例文件路径（项目根目录下的 sample.txt）
      const filePath = path.join(__dirname, '../../sample.txt')

      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          this.fileMessage = {
            type: 'error',
            text: `读取失败: ${err.message}`
          }
          this.fileContent = ''
          return
        }

        this.fileContent = data
        this.fileMessage = {
          type: 'success',
          text: `读取成功 (${filePath})`
        }
      })
    },

    // 写入文件（使用 fs 模块）
    writeSampleFile() {
      const filePath = path.join(__dirname, '../../sample.txt')
      const content = `写入时间: ${new Date().toLocaleString()}\n这是通过 Vue 组件写入的内容`

      fs.writeFile(filePath, content, 'utf8', (err) => {
        if (err) {
          this.fileMessage = {
            type: 'error',
            text: `写入失败: ${err.message}`
          }
          return
        }

        this.fileMessage = {
          type: 'success',
          text: `写入成功 (${filePath})`
        }
        this.fileContent = content // 显示刚写入的内容
      })
    }
  }
}
</script>

<style scoped>
.node-usage {
    padding: 20px;
}

.info-section, .file-section {
    margin-bottom: 30px;
    padding: 15px;
    border: 1px solid #eee;
    border-radius: 6px;
}

button {
    margin: 0 10px 10px 0;
    padding: 8px 16px;
    background-color: #42b983;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

button:hover {
    background-color: #359e75;
}

.file-content {
    margin-top: 15px;
    padding: 10px;
    background-color: #f9f9f9;
    border-radius: 4px;
    max-height: 200px;
    overflow-y: auto;
}

.message {
    margin-top: 10px;
    padding: 8px 12px;
    border-radius: 4px;
    color: white;
}

.message.success {
    background-color: #4caf50;
}

.message.error {
    background-color: #f44336;
}
