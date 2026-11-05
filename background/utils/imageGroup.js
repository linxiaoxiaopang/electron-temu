const fs = require('fs')
const path = require('path')
const { writeGroupWorkbook, DEFAULT_IMAGE_LIMIT } = require('./imageGroupExcel')

const IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg',
  '.avif', '.heic', '.heif', '.tif', '.tiff', '.ico'
]

const MODE = {
  COPY: 'copy',
  MOVE: 'move'
}

// 预览阶段最多返回的重复组数量，避免超大目录产生过大的 IPC 数据
const PREVIEW_GROUP_LIMIT = 200
// 失败明细最多返回的条数
const FAILURE_LIMIT = 500

function isImageFile(fileName) {
  return IMAGE_EXTENSIONS.includes(path.extname(fileName).toLowerCase())
}

function normalizeForCompare(targetPath) {
  return path.resolve(targetPath).toLowerCase()
}

function exists(targetPath) {
  return fs.promises.access(targetPath).then(() => true).catch(() => false)
}

async function ensureDirectory(dirPath, label) {
  if (!dirPath) throw new Error(`请先选择${label}`)
  const stat = await fs.promises.stat(dirPath).catch(() => null)
  if (!stat || !stat.isDirectory()) throw new Error(`${label}不存在或不是文件夹：${dirPath}`)
  return path.resolve(dirPath)
}

async function resolveSourceDirectory(sourceDir) {
  return ensureDirectory(sourceDir, '源文件夹')
}

// 输出根目录与源文件夹同级：复制 → <源名>-copy，移动 → <源名>-move
function resolveOutputDirectory(source, mode) {
  const baseName = path.basename(source)
  if (!baseName) throw new Error('源文件夹不能是磁盘根目录，请选择具体文件夹')
  const suffix = mode === MODE.MOVE ? '-move' : '-copy'
  return path.join(path.dirname(source), `${baseName}${suffix}`)
}

// 预览只判断输出目录状态，执行时才创建；被同名文件占用时给出明确错误
async function prepareOutputDirectory(outputDir, create) {
  const stat = await fs.promises.stat(outputDir).catch(() => null)
  if (stat && !stat.isDirectory()) throw new Error(`输出位置已被同名文件占用：${outputDir}`)
  if (stat) return true
  if (!create) return false
  await fs.promises.mkdir(outputDir, { recursive: true })
  return true
}

/** 图片所在文件夹名与文件名相同即视为已整理，避免重复整理出 a/a/a.jpg */
function isAlreadyOrganized(filePath, sourceDir) {
  const parentDir = path.dirname(filePath)
  if (normalizeForCompare(parentDir) === normalizeForCompare(sourceDir)) return false
  const parentName = path.basename(parentDir)
  const baseName = path.parse(filePath).name
  return Boolean(parentName) && parentName.toLowerCase() === baseName.toLowerCase()
}

/** 迭代遍历源目录，返回 { files, organizedSkipped } */
async function collectImages(sourceDir) {
  const root = path.resolve(sourceDir)
  const queue = [root]
  const files = []
  let organizedSkipped = 0

  while (queue.length > 0) {
    const currentDir = queue.shift()
    let entries = []
    try {
      entries = await fs.promises.readdir(currentDir, { withFileTypes: true })
    } catch (error) {
      // 无权限或已被删除的目录直接跳过，不影响整体扫描
      continue
    }

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.')) continue
        queue.push(fullPath)
      } else if (entry.isFile() && isImageFile(entry.name)) {
        if (isAlreadyOrganized(fullPath, root)) {
          organizedSkipped += 1
          continue
        }
        files.push(fullPath)
      }
    }
  }

  return { files, organizedSkipped }
}

// 从文件名中删除指定关键词（忽略大小写），删空时保留原名
function stripKeyword(baseName, keyword) {
  const needle = String(keyword || '').trim()
  if (!needle) return baseName
  const pattern = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  return baseName.replace(pattern, '').trim() || baseName
}

// 文件夹名：先删关键词，再去掉结尾的 -1、-2 等序号
function resolveFolderName(baseName, keyword) {
  const cleaned = stripKeyword(baseName, keyword)
  const stripped = cleaned.replace(/-\d+$/, '').trim()
  return stripped || cleaned
}

/** 按文件夹名分组，分组键忽略大小写；图片本身不改名 */
function groupImages(files, keyword = '') {
  const groups = new Map()

  files.forEach(filePath => {
    const baseName = resolveFolderName(path.parse(filePath).name, keyword)
    if (!baseName) return
    const key = baseName.toLowerCase()
    if (!groups.has(key)) {
      groups.set(key, { key, name: baseName, files: [] })
    }
    groups.get(key).files.push(filePath)
  })

  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
}

async function previewImageGroups(options = {}) {
  const { sourceDir, mode = MODE.COPY, keyword = '' } = options
  if (mode !== MODE.COPY && mode !== MODE.MOVE) throw new Error(`不支持的处理模式：${mode}`)
  const source = await resolveSourceDirectory(sourceDir)
  const outputDir = resolveOutputDirectory(source, mode)
  const outputExists = await prepareOutputDirectory(outputDir, false)
  const { files, organizedSkipped } = await collectImages(source)
  const groups = groupImages(files, keyword)

  return {
    total: files.length,
    folderCount: groups.length,
    plannedFiles: files.length,
    organizedSkipped,
    outputDir,
    outputExists,
    groups: groups.slice(0, PREVIEW_GROUP_LIMIT).map(group => ({
      name: group.name,
      count: group.files.length
    })),
    groupsTruncated: groups.length > PREVIEW_GROUP_LIMIT
  }
}

/** 组内目标文件名冲突时追加序号，不覆盖已有文件 */
async function resolveTargetPath(targetDir, fileName, usedNames) {
  const parsed = path.parse(fileName)
  let candidate = fileName
  let index = 1

  while (usedNames.has(candidate.toLowerCase()) || (await exists(path.join(targetDir, candidate)))) {
    candidate = `${parsed.name}_${index}${parsed.ext}`
    index += 1
  }

  usedNames.add(candidate.toLowerCase())
  return path.join(targetDir, candidate)
}

async function moveFile(sourcePath, targetPath) {
  try {
    await fs.promises.rename(sourcePath, targetPath)
  } catch (error) {
    // 跨磁盘移动时 rename 会抛 EXDEV，回退为复制后删除
    if (error.code !== 'EXDEV') throw error
    await fs.promises.copyFile(sourcePath, targetPath)
    await fs.promises.unlink(sourcePath)
  }
}

async function transferFile(sourcePath, targetPath, mode) {
  if (mode === MODE.MOVE) return moveFile(sourcePath, targetPath)
  await fs.promises.copyFile(sourcePath, targetPath)
}

/** 执行分组归档 */
async function runImageGroups(options = {}) {
  const {
    sourceDir,
    mode = MODE.COPY,
    keyword = '',
    imageLimit = DEFAULT_IMAGE_LIMIT,
    onProgress,
    isCancelled
  } = options
  if (mode !== MODE.COPY && mode !== MODE.MOVE) throw new Error(`不支持的处理模式：${mode}`)

  const source = await resolveSourceDirectory(sourceDir)
  const outputDir = resolveOutputDirectory(source, mode)
  const { files, organizedSkipped } = await collectImages(source)
  // 每张图片都会归入对应文件夹，单张图片同样建文件夹
  const groups = groupImages(files, keyword)

  const total = groups.reduce((sum, group) => sum + group.files.length, 0)
  const failures = []

  // 有实际归档任务时才创建输出根目录，避免留下空文件夹
  if (groups.length > 0) await prepareOutputDirectory(outputDir, true)

  let success = 0
  let processed = 0
  let archivedGroups = 0
  let cancelled = false
  const archived = []

  const report = groupName => {
    if (typeof onProgress !== 'function') return
    onProgress({ current: processed, total, groupName, phase: mode })
  }

  for (const group of groups) {
    if (typeof isCancelled === 'function' && isCancelled()) {
      cancelled = true
      break
    }

    const targetDir = path.join(outputDir, group.name)
    let groupReady = true
    try {
      await fs.promises.mkdir(targetDir, { recursive: true })
    } catch (error) {
      groupReady = false
      group.files.forEach(filePath => {
        failures.push({ path: filePath, message: `创建文件夹失败：${error.message}` })
      })
      processed += group.files.length
      report(group.name)
    }

    if (!groupReady) continue

    const usedNames = new Set()
    let groupSucceeded = false

    for (const filePath of group.files) {
      if (typeof isCancelled === 'function' && isCancelled()) {
        cancelled = true
        break
      }

      try {
        const targetPath = await resolveTargetPath(targetDir, path.basename(filePath), usedNames)
        await transferFile(filePath, targetPath, mode)
        success += 1
        groupSucceeded = true
      } catch (error) {
        failures.push({ path: filePath, message: error.message })
      }

      processed += 1
      report(group.name)
    }

    if (groupSucceeded) {
      archivedGroups += 1
      archived.push({ name: group.name })
    }
    if (cancelled) break
  }

  // 归档完成后在输出目录生成「图片名称 / AI描述词 / 图片」表格
  let excelPath = ''
  let excelError = ''
  if (!cancelled && archived.length) {
    try {
      excelPath = await writeGroupWorkbook({ outputDir, groups: archived, imageLimit })
    } catch (error) {
      excelError = error.message
    }
  }

  return {
    total,
    groups: archivedGroups,
    success,
    failed: failures.length,
    skipped: Math.max(total - processed, 0),
    organizedSkipped,
    outputDir,
    excelPath,
    excelError,
    cancelled,
    failures: failures.slice(0, FAILURE_LIMIT),
    failuresTruncated: failures.length > FAILURE_LIMIT
  }
}

module.exports = {
  IMAGE_EXTENSIONS,
  MODE,
  isImageFile,
  collectImages,
  groupImages,
  previewImageGroups,
  runImageGroups
}
