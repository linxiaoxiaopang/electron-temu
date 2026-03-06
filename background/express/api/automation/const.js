 const automationOrderTypeList = {
  normal: 1,
  image: 2,
  virtual: 3
}

const automationOrderTypeDic = [
  {
    label: '普通订单',
    value: automationOrderTypeList.normal
  },
  {
    label: '图片订单',
    value: automationOrderTypeList.image
  },
  // {
  //   label: '虚拟订单',
  //   value: automationOrderTypeList.virtual
  // }
]

module.exports  = {
  automationOrderTypeList,
  automationOrderTypeDic
}
