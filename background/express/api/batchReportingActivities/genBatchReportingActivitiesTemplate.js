const path = require('path')
const fs = require('fs').promises
const axios = require('axios')
const { app } = require('electron')
const {
  getGenBatchReportingActivitiesTemplateData,
  getActivityThematicList
} = require('~express/controllers/batchReportingActivities/genBatchReportingActivitiesTemplate')
const { LoopRequest } = require('../../utils/loopUtils')
const { customIpcRenderer } = require('~/utils/event')
const { buildSQL } = require('~express/utils/sqlUtils')
const { flatMapDeepByArray } = require('~/utils/array')
const { ExportExcel } = require('~/utils/excel')
const { formatTime } = require('~/utils/date')
const { zipFiles } = require('~/utils/zip')
const { get, groupBy, uniqBy } = require('lodash')

async function syncGenBatchReportingActivitiesTemplate(req, res, next) {
  let { mallId, list } = req.body
  if (!mallId) return [true, '请选择店铺']
  if (!list?.length) return [true, '活动不能为空']
  const cacheKey = `${mallId}_syncGenBatchReportingActivitiesTemplate`
  const instance = new LoopRequest({
    req,
    res,
    cacheKey
  })
  //放弃之前通过cacheKey的实例请求
  if (!req.body?.requestUuid) {
    await instance.abandonCacheInstanceRequest()
  }
  instance.beforeLoopCallback = async () => {
    return await customIpcRenderer.invoke('db:temu:genBatchReportingActivitiesTemplate:delete', {
      where: {
        mallId
      }
    })
  }
  const queryList = list.map(item => {
    return {
      activityThematicId: item.activityThematicId,
      activityType: item.activityType,
      addSite: true,
      rowCount: 50
    }
  })
  let index = 0
  let totalTasks = 0
  instance.requestCallback = async () => {
    if (instance.summary.totalTasks == 0) {
      totalTasks = await getTotal()
      res.noUseProxy = true
      res.customResult = [false, {
        totalTasks,
        requestUuid: instance.uuid,
        completedTasks: 0
      }]
      next()
      return [false, {
        totalTasks,
        tasks: 0
      }]
    }
    const data = await getMoreData()
    const matchList = data?.data?.matchList || []
    const tasks = matchList.length
    const syncData = matchList.map(item => {
      const query = data.query
      item.activityCode = query?.activityThematicId || query?.activityType
      return {
        mallId,
        json: item
      }
    })
    const response2 = await customIpcRenderer.invoke('db:temu:genBatchReportingActivitiesTemplate:add', syncData)
    if (response2[0]) return response2
    //所有数据都加载完毕
    if (!queryList[index]) totalTasks = instance.summary.completedTasks + tasks
    return [false, {
      totalTasks,
      tasks
    }]
  }
  res.noUseProxy = true
  res.customResult = await instance.action()
  next()

  async function getTotal() {
    const allResponse = []
    for (let item of queryList) {
      const itemResponse = await getGenBatchReportingActivitiesTemplateData({
        req,
        query: {
          ...item,
          rowCount: 1
        }
      })
      allResponse.push(itemResponse)
    }
    return allResponse.reduce((total, item) => {
      const itemTotal = (item?.data?.matchList?.length || 0) + (item?.data?.stillCount || 0)
      return total + itemTotal
    }, 0)
  }

  async function getMoreData() {
    const query = queryList[index]
    const response = await getGenBatchReportingActivitiesTemplateData({
      req,
      query
    })
    if (!response?.data?.hasMore) {
      index++
    } else {
      query.searchScrollContext = response?.data?.searchScrollContext
    }
    response.query = query
    return response
  }
}

async function getSyncGenBatchReportingActivitiesTemplate(req, res, next) {
  const { body } = req
  let { mallId, page, activityCodeList, startSuggestedActivityPrice, endSuggestedActivityPrice } = body
  const replacements = {
    $1: {
      condition: startSuggestedActivityPrice || endSuggestedActivityPrice,
      content: `
        ,json_each(json_extract(t.json, '$.activitySiteInfoList')) AS site,
         json_each(json_extract(site.value, '$.skcList')) AS skc,
         json_each(json_extract(skc.value, '$.skuList')) AS sku
      `
    },
    $2: () => {
      if (startSuggestedActivityPrice && endSuggestedActivityPrice) {
        return `
          AND
          json_extract(sku.value, '$.suggestActivityPrice') > :startSuggestedActivityPrice 
          AND
          json_extract(sku.value, '$.suggestActivityPrice') < :endSuggestedActivityPrice
        `
      }
      if (startSuggestedActivityPrice) {
        return `
          AND
          json_extract(sku.value, '$.suggestActivityPrice') > :startSuggestedActivityPrice
        `
      }
      if (endSuggestedActivityPrice) {
        return `
          AND
          json_extract(sku.value, '$.suggestActivityPrice') < :endSuggestedActivityPrice
        `
      }
    },
    $3: {
      condition: activityCodeList?.length,
      content: `
            AND
            json_extract(t.json, '$.activityCode') 
            IN (:activityCodeList)
        `
    }
  }
  const replaceSql = `
    SELECT DISTINCT
       t.* 
      FROM
       genBatchReportingActivitiesTemplate t
       $1
      WHERE
       t.mallId = :mallId
       $2
       $3
  `

  const sql = buildSQL(replaceSql, replacements)
  res.customResult = await customIpcRenderer.invoke('db:temu:genBatchReportingActivitiesTemplate:query', {
    sql,
    page,
    replacements: {
      mallId,
      activityCodeList,
      startSuggestedActivityPrice,
      endSuggestedActivityPrice
    }
  })
  if (!res.customResult[0]) {
    res.customResult[1] = res.customResult[1].map(item => {
      return JSON.parse(item.json)
    })
  }
  res.noUseProxy = true
  next()
}

async function exportGenBatchReportingActivitiesTemplate(req, res, next) {
  const { body, body: { mallId }, protocol, host } = req
  if (!mallId) return [true, '请选择店铺']
  const cacheKey = `${mallId}_exportGenBatchReportingActivitiesTemplate`
  const instance = new LoopRequest({
    req,
    res,
    cacheKey
  })
  const page = {
    pageIndex: 1,
    pageSize: 1000
  }
  const activityTypeList = await getActivityThematicList(mallId)
  const excelInstanceList = {}
  instance.requestCallback = async () => {
    const relativeUrl = '/temu-agentseller/api/batchReportingActivities/getSyncGenBatchReportingActivitiesTemplate'
    const wWholeUrl = `${protocol}://${host}${relativeUrl}`
    const response = await axios({
      method: 'post',
      url: wWholeUrl,
      data: {
        ...body,
        page
      }
    })
    if (response?.data?.code !== 0) return [true, response.data?.message]
    page.pageIndex++
    const data = response?.data?.data || []
    const totalTasks = response?.data?.page?.total
    const flatData = flatMapDeepByArray(data, ['activitySiteInfoList', 'skcList', 'skuList'], ['match', 'site', 'skc'])
    const formatData = getFormatData(flatData)
    const groupedData = groupBy(formatData, 'activityCode')
    for (let key in groupedData) {
      const activityCode = key
      const itemData = groupedData[key]
      const date = formatTime(new Date(), 'yyyy-MM-dd-hh-mm-ss')
      const name = date + '_' + activityCode
      if (!excelInstanceList[key]) excelInstanceList[key] = getExportExcelInstance(name)
      const exportExcelInstance = excelInstanceList[key]
      exportExcelInstance.generateSheetData(itemData)
    }
    const tasks = data.length
    return [false, {
      totalTasks,
      tasks
    }]
  }
  await instance.action()
  const filePaths = []
  const keys = Object.keys(excelInstanceList)
  const needZip = keys.length > 1
  const contentType = needZip ? 'application/zip' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  for (let key in excelInstanceList) {
    const item = excelInstanceList[key]
    await item.commit()
    filePaths.push(item.outputPath)
  }
  let returnFilePath = filePaths[0] || ''
  res.noUseProxy = true
  if (needZip) {
    const date = formatTime(new Date(), 'yyyy-MM-dd-hh-mm-ss')
    const name = date + '_' + '批量报活动'
    returnFilePath = path.join(app.getAppPath(), `./static/zip/batchReportingActivitiesTemplate/${name}.zip`)
    try {
      await zipFiles(filePaths, returnFilePath)
    } catch (err) {
      res.customResult = [true, err]
      next()
      return
    }
  }
  const fileBuffer = await fs.readFile(returnFilePath)
  res.setHeader('Content-Type', contentType)
  await fs.unlink(returnFilePath)
  if (needZip) {
    for (let item of filePaths) {
      await fs.unlink(item)
    }
  }
  res.customResult = [false, fileBuffer]
  next()

  function getFormatData(data) {
    return data.map(item => {
      return {
        ...item,
        activityName: get(item, '$match.activityName', ''),
        productId: get(item, '$match.productId', ''),
        activityCode: get(item, '$match.activityCode', ''),
        suggestActivityStock: get(item, '$match.suggestActivityStock', ''),
        siteName: get(item, '$site.siteName', ''),
        skcExtCode: get(item, '$skc.extCode', ''),
        activityCodeText: (() => {
          const { activityCode } = item.$match
          const fItem = activityTypeList.find(item => {
            if (item.activityThematicId) return item.activityThematicId == activityCode
            return item.activityType == activityCode
          })
          const { activityName } = fItem || {}
          item.$match.activityName = activityName
          return [activityCode, activityCode < 100000 ? '长期活动' : '专题活动', activityName].join('-')
        })(),
        skcId: get(item, '$skc.skcId', ''),
        color: get(item, '$skc.color', ''),
        size: get(item, '$skc.size', ''),
        rawSuggestActivityPrice: item.suggestActivityPrice / 100
      }
    })
  }

  function getExportExcelInstance(filename) {
    const column = {
      activityCode: {
        label: '活动编码',
        prop: 'activityCode'
      },


      activityCodeText: {
        label: '活动类型(活动主题）',
        prop: 'activityCodeText'
      },

      productId: {
        label: 'SPU ID',
        prop: 'productId'
      },

      skcId: {
        label: 'SKC ID',
        prop: 'skcId'
      },

      skcExtCode: {
        label: 'SKC货号',
        prop: 'skcExtCode'
      },

      skuId: {
        label: 'SKU ID',
        prop: 'skuId'
      },

      extCode: {
        label: 'SKU货号',
        prop: 'extCode'
      },

      color: {
        label: '颜色属性',
        prop: 'color'
      },

      size: {
        label: '尺码属性',
        prop: 'size'
      },

      siteName: {
        label: '站点',
        prop: 'siteName'
      },

      rawSuggestActivityPrice: {
        label: '活动申报价格',
        prop: 'rawSuggestActivityPrice'
      },

      currency: {
        label: '币种',
        prop: 'currency'
      },

      suggestActivityStock: {
        label: '活动库存',
        prop: 'suggestActivityStock'
      }
    }
    const exportDataExcelColumn = [
      column.activityCodeText,
      column.productId,
      column.skcId,
      column.skcExtCode,
      column.skuId,
      column.extCode,
      column.color,
      column.size,
      column.siteName,
      column.rawSuggestActivityPrice,
      column.currency
    ]
    const exportStockExcelColumn = [
      column.activityCodeText,
      column.productId,
      column.suggestActivityStock
    ]
    let uniqData = []
    const exportExcelInstance = new ExportExcel({
      filename: `./static/excel/batchReportingActivitiesTemplate/${filename}.xlsx`,
      sheetOption: [
        {
          headers: exportDataExcelColumn.map(item => {
            return {
              key: item.prop,
              header: item.label,
              width: 20
            }
          }),
          name: '活动申报价格'
        },
        {
          headers: exportStockExcelColumn.map(item => {
            return {
              key: item.prop,
              header: item.label,
              width: 20
            }
          }),
          handleExcelData(data) {
            data = uniqBy(data, 'productId')
            const addData = data.filter(item => !uniqData.find(sItem => sItem.productId == item.productId))
            uniqData.push(...addData)
            return addData
          },
          name: '活动库存'
        }
      ]
    })
    exportExcelInstance.init()
    return exportExcelInstance
  }
}

module.exports = {
  syncGenBatchReportingActivitiesTemplate,
  getSyncGenBatchReportingActivitiesTemplate,
  exportGenBatchReportingActivitiesTemplate
}
