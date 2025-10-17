const fs = require('fs')
const path = require('path')
const ExcelJS = require('exceljs')
const { isArray, isFunction } = require('lodash')
const { getPathToRoot } = require('~/utils/path')

class GenerateSheet {
  constructor(
    {
      workbook,
      sheetOption
    }
  ) {
    this.sheetOption = sheetOption
    this.worksheet = workbook.addWorksheet(this.name)
  }

  get name() {
    return this.sheetOption.name
  }

  get headers() {
    return this.sheetOption.headers
  }

  get handleExcelData() {
    if(this.sheetOption.handleExcelData) return this.sheetOption.handleExcelData
    return (data) => data
  }

  formatHeaderStyle(headerStyle) {
    if (!isFunction(headerStyle)) return () => headerStyle || {}
    return headerStyle
  }

  generateSheetHeaders() {
    // 设置列
    this.worksheet.columns = this.headers
    const headerRow = this.worksheet.getRow(1)
    Object.assign(headerRow, this.formatHeaderStyle(headerRow, this.worksheet, this))
    headerRow.commit()
  }

  generateSheetData(data) {
    data = this.handleExcelData(data)
    data.map(item => {
      const row = this.worksheet.addRow(item)
      row.commit()
    })
  }

  init() {
    this.generateSheetHeaders(this.sheetOption)
  }
}

class ExportExcel {
  constructor(
    {
      filename,
      sheetOption = []
    }
  ) {
    const outputPath = this.outputPath = getPathToRoot(filename)
    const dirPath = path.dirname(outputPath)
    this.sheetOptionList = this.formatSheetOption(sheetOption)
    fs.mkdirSync(dirPath, { recursive: true })
    this.stream = fs.createWriteStream(outputPath)
    this.workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: this.stream })
    this.sheets = this.sheetOptionList.map(item => {
      return new GenerateSheet({
        workbook: this.workbook,
        sheetOption: item
      })
    })
  }

  formatSheetOption(sheetOption) {
    if (!isArray(sheetOption)) sheetOption = [sheetOption]
    return sheetOption
  }

  generateSheetData(data) {
    return this.sheets.map(item => item.generateSheetData(data))
  }

  init() {
    return this.sheets.map(item => item.init())
  }

  async commit() {
    await this.workbook.commit()
  }
}

module.exports = {
  ExportExcel
}
