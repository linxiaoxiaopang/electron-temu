const automationOrderTypeList = {
  normal: 1,
  image: 2,
  virtual: 3,
  y2: 4
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
  },
  {
    label: 'y2订单',
    value: automationOrderTypeList.y2
  }
]

const allProcessNodesMap = {
  ['product:all:下载Temu效果图']: 'product:all:下载Temu效果图',
  ['product:all:下载Temu原图']: 'product:all:下载Temu原图',
  ['product:all:temu更换系统数据']: 'product:all:temu更换系统数据',
  ['order:all:存储报关信息']: 'order:all:存储报关信息',
  ['order:all:写入y2外部订单']: 'order:all:写入y2外部订单',
  ['order:all:写入y2入仓单']: 'order:all:写入y2入仓单',
  ['product:all:导入微定制订单']: 'product:all:导入微定制订单',
  ['label:picture:模板图像处理']: 'label:picture:模板图像处理',
  ['label:picture:切图']: 'label:picture:切图',
  ['label:picture:裁切透明像素']: 'label:picture:裁切透明像素',
  ['label:picture:抠图']: 'label:picture:抠图',
  ['label:picture:轮廓']: 'label:picture:轮廓',
  ['label:picture:高清放大']: 'label:picture:高清放大',
  ['label:picture:卡通']: 'label:picture:卡通',
  ['label:picture:手动定制模板替换']: 'label:picture:手动定制模板替换',
  ['label:picture:定制模板替换']: 'label:picture:定制模板替换',
  ['product:all:上传原图']: 'product:all:上传原图',
  ['product:all:创建产品']: 'product:all:创建产品',
  ['product:all:上传文字校验']: 'product:all:上传文字校验',
  ['product:all:上传预览图']: 'product:all:上传预览图',
  ['order:all:上传Y2入仓单']: 'order:all:上传Y2入仓单'
}

const allProcessListForImage = [
  allProcessNodesMap['product:all:下载Temu效果图'],
  allProcessNodesMap['product:all:下载Temu原图'],
  allProcessNodesMap['product:all:temu更换系统数据'],
  allProcessNodesMap['product:all:导入微定制订单'],
  allProcessNodesMap['label:picture:模板图像处理'],
  allProcessNodesMap['label:picture:切图'],
  allProcessNodesMap['label:picture:裁切透明像素'],
  allProcessNodesMap['label:picture:抠图'],
  allProcessNodesMap['label:picture:轮廓'],
  allProcessNodesMap['label:picture:高清放大'],
  allProcessNodesMap['label:picture:卡通'],
  allProcessNodesMap['label:picture:手动定制模板替换'],
  allProcessNodesMap['label:picture:定制模板替换'],
  allProcessNodesMap['product:all:上传原图']
]

const allProcessListForNormal = [
  ...allProcessListForImage,
  allProcessNodesMap['product:all:创建产品'],
  allProcessNodesMap['product:all:上传文字校验'],
  allProcessNodesMap['product:all:上传预览图']
]

const allProcessListForVirtual = [
  ...allProcessListForNormal
]

const allProcessListForY2 = [
  allProcessNodesMap['product:all:下载Temu效果图'],
  allProcessNodesMap['product:all:下载Temu原图'],
  allProcessNodesMap['product:all:temu更换系统数据'],
  allProcessNodesMap['order:all:存储报关信息'],
  allProcessNodesMap['order:all:写入y2外部订单'],
  allProcessNodesMap['order:all:写入y2入仓单'],
  allProcessNodesMap['product:all:导入微定制订单'],
  allProcessNodesMap['label:picture:模板图像处理'],
  allProcessNodesMap['label:picture:切图'],
  allProcessNodesMap['label:picture:裁切透明像素'],
  allProcessNodesMap['label:picture:抠图'],
  allProcessNodesMap['label:picture:轮廓'],
  allProcessNodesMap['label:picture:高清放大'],
  allProcessNodesMap['label:picture:卡通'],
  allProcessNodesMap['label:picture:手动定制模板替换'],
  allProcessNodesMap['label:picture:定制模板替换'],
  allProcessNodesMap['product:all:上传原图'],
  allProcessNodesMap['product:all:创建产品'],
  allProcessNodesMap['product:all:上传文字校验'],
  allProcessNodesMap['product:all:上传预览图'],
  allProcessNodesMap['order:all:上传Y2入仓单']
]

const allProcessListForDefault = [
  ...allProcessListForY2
]

const allProcessNodesList = {
  [automationOrderTypeList.normal]: allProcessListForNormal,
  [automationOrderTypeList.image]: allProcessListForImage,
  [automationOrderTypeList.virtual]: allProcessListForVirtual,
  [automationOrderTypeList.y2]: allProcessListForY2,
  default: allProcessListForDefault
}

module.exports = {
  automationOrderTypeList,
  automationOrderTypeDic,
  allProcessNodesList,
  allProcessNodesMap
}
