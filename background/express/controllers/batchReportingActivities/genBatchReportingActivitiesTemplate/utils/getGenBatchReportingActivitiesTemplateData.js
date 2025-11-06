const { getTemuTarget } = require('~store/user')
const { createProxyToGetTemuData } = require('~express/middleware/proxyMiddleware')
const { getUUID } = require('~utils/random')

class GetGenSemiBatchReportingActivitiesTemplateData {
  constructor(
    {
      req,
      query
    }
  ) {
    this.req = req
    this.query = query
    this.relativeUrl = '/api/kiana/gamblers/marketing/enroll/semi/scroll/match'
  }

  async getScrollMatch() {
    const { req, query } = this
    const wholeUrl = `${getTemuTarget()}${this.relativeUrl}`
    return await createProxyToGetTemuData(req)(wholeUrl, { data: query })
  }

  handleResponse(response) {
    return response
  }

  async action() {
    let response = await this.getScrollMatch()
    response = this.handleResponse(response)
    return response
  }
}

class GetGenFullBatchReportingActivitiesTemplateData extends GetGenSemiBatchReportingActivitiesTemplateData {
  constructor(option) {
    super(option)
    this.relativeUrl = '/api/kiana/gamblers/marketing/enroll/scroll/match'
  }

  handleResponse(response) {
    const matchList = response?.data?.matchList || []
    matchList.map(item => {
      const skcList = item.skcList || []
      delete item.skcList
      item.activitySiteInfoList = [{
        siteId: getUUID(),
        siteName: null,
        skcList
      }]
    })
    return response
  }
}

module.exports = {
  GetGenSemiBatchReportingActivitiesTemplateData,
  GetGenFullBatchReportingActivitiesTemplateData
}
