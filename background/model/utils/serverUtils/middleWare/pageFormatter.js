const sequelize = require('~model/temu/db')

module.exports = async function (ctx, next) {
  const { req, res, server } = ctx
  const { sql, page, pageQuery, whereQuery, convertToCount, replacements } = req
  if (!pageQuery) return next()
  let total = 0
  if (convertToCount) {
    const [totalRes] = await sequelize.query(convertToCountSql(sql), {
      replacements,
      // 打印生成的SQL，用于验证
      logging: sql => console.log('SQL:', sql)
    })
    total = totalRes?.[0]?.total || 0
  } else {
    total = await server.model.count(whereQuery)
  }
  res.page = {
    total,
    pageIndex: page.pageIndex,
    pageSize: page.pageSize
  }
  next()
}


function getFirstTableName(sql) {
  // 匹配第一个表名的正则
  const regex = /(?:\b(?:FROM|UPDATE|INSERT\s+INTO|JOIN|FROM\s+ONLY)\s+)(?!\()([\w`"'\[\]]+)/i;
  const match = sql.match(regex);

  if (match) {
    // 去除表名中的引号/反引号/方括号
    return match[1].replace(/[`"'[\]]/g, '');
  }
  return null; // 未匹配到表名
}


function convertToCountSql(originalSql) {
  // 正则表达式：匹配 SELECT DISTINCT t.* 部分，并替换为 COUNT(DISTINCT t.id)
  // 适配各种格式（如换行、空格差异）
  const regex = /SELECT .+? from/i
  const table = getFirstTableName(originalSql)
  // 替换为 COUNT(DISTINCT t.id) AS total，并保留FROM及之后的部分
  const countSql = originalSql.replace(regex, `SELECT COUNT(DISTINCT ${table}.id) AS total from`)

  return countSql
}
