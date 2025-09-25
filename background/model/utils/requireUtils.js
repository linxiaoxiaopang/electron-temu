const fs = require('fs').promises

/**
 * 读取指定文件夹下的所有子文件夹
 * @param {string} dirPath - 要扫描的文件夹路径
 * @returns {Promise<string[]>} - 子文件夹名称数组
 */
async function getSubdirectories(dirPath) {
  try {
    // 读取目录下所有条目并获取详细信息
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    // 筛选出所有文件夹并返回它们的名称
    const subdirectories = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)

    return subdirectories
  } catch (err) {
    console.error('读取文件夹时出错:', err)
    throw err
  }
}

async function requiredModelDefine(targetDir, exclude = [], include = []) {
  const folders = await getSubdirectories(targetDir)
  const exportList = folders.map(folder => {
    if (include.length && !include.includes(folder)) return
    if (exclude.includes(folder)) return
    return require(`${targetDir}/${folder}/init`)
  })
  const pArr = exportList.map(item => item?.init())
  return await Promise.all(pArr)
}

module.exports = {
  getSubdirectories,
  requiredModelDefine
}
