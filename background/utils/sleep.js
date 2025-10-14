async function waitTimeByNum(num) {
  await new Promise(resolve => {
    setTimeout(() => {
      resolve(true)
    }, num)
  })
}

module.exports = {
  waitTimeByNum
}
