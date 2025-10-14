function formatTime(date, format) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  let formattedTime = format
  formattedTime = formattedTime.replace('YYYY', year)
  formattedTime = formattedTime.replace('yyyy', year)
  formattedTime = formattedTime.replace('MM', month)
  formattedTime = formattedTime.replace('DD', day)
  formattedTime = formattedTime.replace('dd', day)
  formattedTime = formattedTime.replace('HH', hours)
  formattedTime = formattedTime.replace('hh', hours)
  formattedTime = formattedTime.replace('mm', minutes)
  formattedTime = formattedTime.replace('ss', seconds)

  return formattedTime
}



module.exports = {
  formatTime
}
