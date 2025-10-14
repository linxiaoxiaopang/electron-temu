const { flatMapDeep, isPlainObject, isArray, upperFirst, get } = require('lodash')

/**
 * @description: 扁平化数组或对象
 * @param Array | Object  被扁平化的数组|对象
 * @param Array 扁平化字段列表
 * @return {Array
 */
function flatMapDeepByArray(data, mapArr = [], mapKeyArr = [], needFill = false) {
  let flatMapArr = []
  if (!mapArr.length) return []
  if (isPlainObject(data)) {
    const shiftData = data[mapArr.shift()]
    flatMapArr = Array.isArray(shiftData) ? shiftData : [shiftData]
  } else {
    flatMapArr = data
  }
  //兼容旧方法
  if (!mapKeyArr || !mapKeyArr.length) {
    for (let i = 0; i < mapArr.length; i++) {
      flatMapArr = flatMapDeep(flatMapArr, (n) => {
        //防止n[mapArr[i]]是undefined报错
        return n[mapArr[i]] || []
      })
    }
    return flatMapArr.filter(Boolean)
  }
  //重置mapKeyArr
  mapKeyArr = mapKeyArr.slice(0, mapArr.length)
  for (let i = 0; i < mapArr.length; i++) {
    flatMapArr = flatMapDeep(flatMapArr, (n) => {
      const arr = get(n, `${[mapArr[i]]}`, [])
      const sliceKeyArr = mapKeyArr.slice(0, i + 1)
      const sliceMapArr = mapArr.slice(0, i + 1)
      sliceKeyArr.map((key, k) => {
        arr.map((nItem, index) => {
          nItem.$index = index
          if (k == sliceMapArr.length - 1) {
            return (nItem[`$${key}`] = n)
          }
          nItem[`$${key}`] = n[`$${key}`]
        })
      })
      return arr
    })
  }
  //需要填充
  if (needFill) flatMapArr.map((item) => fillProps(item, mapKeyArr))
  return flatMapArr
}

/**
 * @description: 数组填充属性值
 * @param Array | Object  待处理的对象
 * @param Array 待填充的对象
 * @return
 */
function fillProps(obj, props) {
  if (!isArray(props)) props = [props]
  props = props.map(prop => `$${prop}`)
  props.map(prop => {
    const val = obj[prop]
    if (!isPlainObject(val)) return
    for (let key in val) {
      const valKey = obj[key] ? `${prop}${upperFirst(key)}` : key
      obj[valKey] = val[key]
    }
  })
}

module.exports = {
  flatMapDeepByArray
}
