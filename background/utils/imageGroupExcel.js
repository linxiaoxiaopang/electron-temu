const fs = require('fs')
const path = require('path')
const ExcelJS = require('exceljs')

const SHEET_NAME = '标题结果'
const HEADERS = ['图片名称', 'AI描述词', '图片']
const THUMB = 120
const GAP = 6
const PER_ROW = 5
const EMU_PER_PX = 9525
// 每个文件夹写入表格的图片张数，默认 3 张
const DEFAULT_IMAGE_LIMIT = 3
const MAX_IMAGE_LIMIT = 50

const pxToEmu = px => Math.round(px * EMU_PER_PX)

// 0 表示不限制张数
function normalizeImageLimit(value) {
  const limit = Math.floor(Number(value))
  if (!Number.isFinite(limit) || limit <= 0) return 0
  return Math.min(limit, MAX_IMAGE_LIMIT)
}

// 主进程可用 nativeImage 压缩缩略图；测试环境下回退为原图
function createImagePayload(filePath) {
  try {
    const { nativeImage } = require('electron')
    if (nativeImage) {
      const image = nativeImage.createFromPath(filePath)
      if (!image.isEmpty()) {
        const size = image.getSize()
        const resize = size.width >= size.height
          ? { width: THUMB }
          : { height: THUMB }
        return { buffer: image.resize(resize).toJPEG(88), extension: 'jpeg' }
      }
    }
  } catch (error) {
    // 忽略，使用原始文件
  }

  return {
    buffer: fs.readFileSync(filePath),
    extension: path.extname(filePath).slice(1).toLowerCase() || 'jpeg'
  }
}

function listGroupImages(dir) {
  try {
    return fs.readdirSync(dir)
      .filter(name => !name.startsWith('.'))
      .sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))
      .map(name => path.join(dir, name))
  } catch (error) {
    return []
  }
}

/**
 * 在输出目录生成「图片名称 / AI描述词 / 图片」表格
 * @param {object} options outputDir、groups（[{ name }]）、fileName、imageRoot（图片所在根目录）、imageLimit（每个文件夹写入张数，默认 3）
 * @returns {Promise<string>} 生成的表格路径
 */
async function writeGroupWorkbook({
  outputDir,
  groups = [],
  fileName = '图片与标题.xlsx',
  imageRoot = '',
  imageLimit = DEFAULT_IMAGE_LIMIT
}) {
  const limit = normalizeImageLimit(imageLimit)
  const perRow = Math.min(PER_ROW, limit || PER_ROW)
  const columnChars = Math.max(12, Math.round((perRow * (THUMB + GAP) + GAP - 5) / 7))

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(SHEET_NAME, { views: [{ state: 'frozen', ySplit: 1 }] })

  sheet.columns = [{ width: 18 }, { width: 60 }, { width: columnChars }]

  const header = sheet.addRow(HEADERS)
  header.height = 22
  header.eachCell(cell => {
    cell.font = { name: '宋体', size: 11, bold: true }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
  })

  groups.forEach((group, index) => {
    const allFiles = listGroupImages(path.join(imageRoot || outputDir, group.name))
    const files = limit ? allFiles.slice(0, limit) : allFiles
    const lines = Math.max(1, Math.ceil(files.length / perRow))
    const row = sheet.addRow([group.name, ''])
    const rowIndex = index + 2

    // 行高按像素换算成磅，刚好容纳整行缩略图
    row.height = (lines * (THUMB + GAP) + GAP) * 0.75
    row.getCell(1).font = { name: '宋体', size: 11 }
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' }
    row.getCell(2).font = { name: '宋体', size: 11 }
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }

    files.forEach((filePath, fileIndex) => {
      let payload
      try {
        payload = createImagePayload(filePath)
      } catch (error) {
        return
      }

      const imageId = workbook.addImage({ buffer: payload.buffer, extension: payload.extension })
      // exceljs 的列宽换算与实际列宽不一致，直接用 EMU 定位更准确
      const left = pxToEmu(GAP + (fileIndex % perRow) * (THUMB + GAP))
      const top = pxToEmu(GAP + Math.floor(fileIndex / perRow) * (THUMB + GAP))
      sheet.addImage(imageId, {
        tl: { nativeCol: 2, nativeColOff: left, nativeRow: rowIndex - 1, nativeRowOff: top },
        br: {
          nativeCol: 2,
          nativeColOff: left + pxToEmu(THUMB),
          nativeRow: rowIndex - 1,
          nativeRowOff: top + pxToEmu(THUMB)
        },
        editAs: 'oneCell'
      })
    })
  })

  await fs.promises.mkdir(outputDir, { recursive: true })
  const targetPath = path.join(outputDir, fileName)
  await workbook.xlsx.writeFile(targetPath)
  return targetPath
}

module.exports = { writeGroupWorkbook, DEFAULT_IMAGE_LIMIT, MAX_IMAGE_LIMIT }
