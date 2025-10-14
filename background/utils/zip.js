const fs = require('fs')
const path = require('path')
const archiver = require('archiver')

function zipFiles(filePaths, outputPath) {
  return new Promise((resolve, reject) => {
    // 创建输出流
    const dirPath = path.dirname(outputPath)
    fs.mkdirSync(dirPath, { recursive: true })
    const output = fs.createWriteStream(outputPath)
    const archive = archiver('zip', { zlib: { level: 9 } })
    // 事件处理
    output.on('close', () => resolve(archive.pointer()))
    archive.on('error', err => reject(err))

    // 管道连接
    archive.pipe(output)

    // 添加文件
    filePaths.forEach(filePath => {
      archive.file(filePath, { name: filePath.split(/\\|\//g).pop() })
    })

    // 完成打包
    archive.finalize()
  })
}

module.exports = {
  zipFiles
}
