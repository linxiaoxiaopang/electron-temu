const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('url')
const { writeGroupWorkbook, DEFAULT_IMAGE_LIMIT } = require('./imageGroupExcel')

const IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg',
  '.avif', '.heic', '.heif', '.tif', '.tiff', '.ico'
]

const MODE = {
  COPY: 'copy'
}

// 预览阶段最多返回的分组数量，避免超大目录产生过大的 IPC 数据
const PREVIEW_GROUP_LIMIT = 200
// 预览阶段每组最多返回的图片条数，超出部分不参与审核排序
const PREVIEW_FILE_LIMIT = 30
// 失败明细最多返回的条数
const FAILURE_LIMIT = 500
// 归档命名的起始序号，默认从 -2 开始（-1 留给手动补的首图）
const DEFAULT_START_INDEX = 2
const MAX_START_INDEX = 99

// 起始序号：1-99 的整数，非法输入回落到默认值
function normalizeStartIndex(value) {
  const index = Math.floor(Number(value))
  if (!Number.isFinite(index) || index < 1) return DEFAULT_START_INDEX
  return Math.min(index, MAX_START_INDEX)
}

function isImageFile(fileName) {
  return IMAGE_EXTENSIONS.includes(path.extname(fileName).toLowerCase())
}

// -1、-2、-10 按数字大小排序，而不是按字符排序
function naturalCompare(a, b) {
  return a.localeCompare(b, 'zh-CN', { numeric: true })
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

// 输出根目录与源文件夹同级：<源名>-copy，源文件夹本身只读
function resolveOutputDirectory(source) {
  const baseName = path.basename(source)
  if (!baseName) throw new Error('源文件夹不能是磁盘根目录，请选择具体文件夹')
  return path.join(path.dirname(source), `${baseName}-copy`)
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

// 文件夹名：先删关键词，再去掉结尾的 -1、-2、_1、_01 等序号
function resolveFolderName(baseName, keyword) {
  const cleaned = stripKeyword(baseName, keyword)
  const stripped = cleaned.replace(/[-_]\d+$/, '').trim()
  return stripped || cleaned
}

const IMAGES_FOLDER_NAME = 'images'

/**
 * 找到图片最近的 images 祖先目录（不含源目录本身）
 * 例如 源/商品A/images/1.jpg → { imagesDir: 源/商品A/images, targetDir: 源/商品A }
 */
function resolveImagesTarget(filePath, sourceDir) {
  const root = normalizeForCompare(sourceDir)
  let dir = path.dirname(path.resolve(filePath))

  while (normalizeForCompare(dir) !== root) {
    const parent = path.dirname(dir)
    if (parent === dir) return null
    if (path.basename(dir).toLowerCase() === IMAGES_FOLDER_NAME) {
      return { imagesDir: dir, targetDir: parent }
    }
    dir = parent
  }

  return null
}

/** 统计 images 文件夹里的图片，仅用于提示，源文件夹保持只读 */
function inspectImagesFolders(files, sourceDir) {
  const folders = new Set()
  let pending = 0

  files.forEach(filePath => {
    const target = resolveImagesTarget(filePath, sourceDir)
    if (!target) return
    folders.add(normalizeForCompare(target.imagesDir))
    pending += 1
  })

  return { imagesFolders: folders.size, imagesPending: pending }
}

/** images 文件夹里的图片归入它的上一级文件夹（上架文件夹），其余按文件名分组 */
function resolveGroupBaseName(filePath, keyword, sourceDir) {
  if (sourceDir) {
    const target = resolveImagesTarget(filePath, sourceDir)
    if (target) return resolveFolderName(path.basename(target.targetDir), keyword)
  }
  return resolveFolderName(path.parse(filePath).name, keyword)
}

/** 按文件夹名分组，分组键忽略大小写；组内按 -1、-2 自然排序；图片本身不改名 */
function groupImages(files, keyword = '', sourceDir = '') {
  const groups = new Map()

  files.forEach(filePath => {
    const baseName = resolveGroupBaseName(filePath, keyword, sourceDir)
    if (!baseName) return
    const key = baseName.toLowerCase()
    if (!groups.has(key)) {
      groups.set(key, { key, name: baseName, files: [] })
    }
    groups.get(key).files.push(filePath)
  })

  const list = Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  list.forEach(group => group.files.sort((a, b) => naturalCompare(path.basename(a), path.basename(b))))
  return list
}

// 审核阶段需要渲染层直接展示原图，这里生成 file:// 地址
function toPreviewFile(filePath) {
  let size = 0
  try {
    size = fs.statSync(filePath).size
  } catch (error) {
    size = 0
  }

  return {
    name: path.basename(filePath),
    path: filePath,
    fileUrl: pathToFileURL(filePath).href,
    ext: path.extname(filePath).toLowerCase(),
    size
  }
}

async function previewImageGroups(options = {}) {
  const { sourceDir, keyword = '', includeFiles = true } = options
  const source = await resolveSourceDirectory(sourceDir)
  const outputDir = resolveOutputDirectory(source)
  const outputExists = await prepareOutputDirectory(outputDir, false)
  const { files, organizedSkipped } = await collectImages(source)
  const groups = groupImages(files, keyword, source)
  const imagesInfo = inspectImagesFolders(files, source)

  const visibleGroups = groups.slice(0, PREVIEW_GROUP_LIMIT)
  const groupsTruncated = groups.length > PREVIEW_GROUP_LIMIT
  const filesTruncated = includeFiles
    && visibleGroups.some(group => group.files.length > PREVIEW_FILE_LIMIT)

  return {
    total: files.length,
    folderCount: groups.length,
    plannedFiles: files.length,
    organizedSkipped,
    imagesFolders: imagesInfo.imagesFolders,
    imagesPending: imagesInfo.imagesPending,
    outputDir,
    outputExists,
    groups: visibleGroups.map(group => {
      const item = { name: group.name, count: group.files.length }
      if (includeFiles) {
        item.files = group.files.slice(0, PREVIEW_FILE_LIMIT).map(toPreviewFile)
      }
      return item
    }),
    groupsTruncated,
    filesTruncated,
    fileLimit: PREVIEW_FILE_LIMIT
  }
}

/** 审核计划校验：组名不允许越级，文件必须位于源目录内且为图片 */
function normalizePlan(plan, sourceDir) {
  if (!Array.isArray(plan)) throw new Error('审核计划格式不正确')
  const root = path.resolve(sourceDir)
  const rootPrefix = root.endsWith(path.sep) ? root : root + path.sep
  const result = []
  const index = new Map()

  plan.forEach(item => {
    if (!item || typeof item !== 'object') return
    const name = path.basename(String(item.name || '').trim())
    if (!name || name === '.' || name === '..') return

    const key = name.toLowerCase()
    if (!index.has(key)) {
      const entry = { name, files: [], originalCount: 0, truncated: Boolean(item.truncated) }
      index.set(key, entry)
      result.push(entry)
    }

    const entry = index.get(key)
    const seen = new Set(entry.files.map(file => file.toLowerCase()))
    const list = Array.isArray(item.files) ? item.files : []
    list.forEach(value => {
      const filePath = path.resolve(String(value || ''))
      if (!filePath.startsWith(rootPrefix)) return
      if (!isImageFile(filePath)) return
      if (seen.has(filePath.toLowerCase())) return
      seen.add(filePath.toLowerCase())
      entry.files.push(filePath)
    })

    const count = Number(item.count)
    if (Number.isFinite(count) && count > entry.originalCount) entry.originalCount = count
  })

  return result
}

/** 按审核计划生成归档组；未出现在计划中的分组按原顺序完整保留 */
function resolveArchiveGroups({ plan, files, keyword, source }) {
  const allGroups = groupImages(files, keyword, source)
  if (!Array.isArray(plan)) return { groups: allGroups, excluded: 0 }

  const byName = new Map(allGroups.map(group => [group.name.toLowerCase(), group]))
  const planned = normalizePlan(plan, source)
  const used = new Set()
  const groups = []
  let excluded = 0

  planned.forEach(item => {
    const key = item.name.toLowerCase()
    used.add(key)
    const origin = byName.get(key)
    const name = origin ? origin.name : item.name
    const list = item.files.slice()

    if (origin) {
      if (item.truncated) {
        // 组内超过预览上限时，未展示的图片按原顺序追加
        const picked = new Set(list.map(file => file.toLowerCase()))
        origin.files.forEach(file => {
          if (!picked.has(file.toLowerCase())) list.push(file)
        })
      } else {
        excluded += Math.max(origin.files.length - list.length, 0)
      }
    }

    if (list.length) groups.push({ name, files: list })
  })

  allGroups.forEach(group => {
    if (used.has(group.name.toLowerCase())) return
    groups.push({ name: group.name, files: group.files })
  })

  return { groups, excluded }
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

/** 执行分组归档：只复制，源文件夹保持只读 */
async function runImageGroups(options = {}) {
  const {
    sourceDir,
    keyword = '',
    imageLimit = DEFAULT_IMAGE_LIMIT,
    startIndex = DEFAULT_START_INDEX,
    plan,
    onProgress,
    isCancelled
  } = options
  const startNumber = normalizeStartIndex(startIndex)

  const source = await resolveSourceDirectory(sourceDir)
  const outputDir = resolveOutputDirectory(source)
  const collected = await collectImages(source)
  const files = collected.files
  const imagesInfo = inspectImagesFolders(files, source)
  // 每张图片都会归入对应文件夹，单张图片同样建文件夹
  const { groups, excluded } = resolveArchiveGroups({ plan, files, keyword, source })

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
    onProgress({ current: processed, total, groupName, phase: MODE.COPY })
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

    for (let fileIndex = 0; fileIndex < group.files.length; fileIndex += 1) {
      const filePath = group.files[fileIndex]
      if (typeof isCancelled === 'function' && isCancelled()) {
        cancelled = true
        break
      }

      try {
        // 审核后的顺序即最终命名顺序：组名-起始序号、组名-起始序号+1……
        const fileName = `${group.name}-${startNumber + fileIndex}${path.extname(filePath)}`
        const targetPath = await resolveTargetPath(targetDir, fileName, usedNames)
        await fs.promises.copyFile(filePath, targetPath)
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
    excluded,
    startIndex: startNumber,
    imagesFolders: imagesInfo.imagesFolders,
    imagesPending: imagesInfo.imagesPending,
    skipped: Math.max(total - processed, 0),
    organizedSkipped: collected.organizedSkipped,
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
  normalizeStartIndex,
  DEFAULT_START_INDEX,
  MAX_START_INDEX,
  collectImages,
  groupImages,
  previewImageGroups,
  runImageGroups
}
