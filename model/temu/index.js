const Model = require('./batchReportingActivities/index')
const bindBatchReportingActivitiesEvent = require('./batchReportingActivities/bindEvent')

function bindEvent() {
  bindBatchReportingActivitiesEvent()
}

async function sync() {
  try {
    await Model.sync({ alter: true })
  } catch (err) {
    console.log('err', err)
  }
}

async function init() {
  bindEvent()
  await sync()
}


module.exports = {
  init
}
