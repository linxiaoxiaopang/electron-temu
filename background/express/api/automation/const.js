 const automationOrderTypeList = {
  normal: 1,
  image: 2,
  virtual: 3
}

const automationOrderTypeDic = [
  {
    label: '备货单处理',
    value: automationOrderTypeList.normal
  },
  {
    label: '图片预处理',
    value: automationOrderTypeList.image
  },
  {
    label: '虚拟订单处理',
    value: automationOrderTypeList.virtual
  }
]

module.exports  = {
  automationOrderTypeList,
  automationOrderTypeDic
}
