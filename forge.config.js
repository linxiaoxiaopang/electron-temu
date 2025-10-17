const { FusesPlugin } = require('@electron-forge/plugin-fuses')
const { FuseV1Options, FuseVersion } = require('@electron/fuses')
const path = require('path')
const { promises: fs } = require('fs')

module.exports = {
  packagerConfig: {
    name: "electron-temu",
    version: "0.1.0",
    asar: true,
    platform: "win32", // 目标平台：win32/darwin/linux
    arch: "ia32", // 目标架构：x64/arm64/ia32
    // ignore(path) {
    //   if (path.includes("electron")) return false
    //   return false
    // },
    extraResource: [
      'mock', // 开发环境中的资源目录路径
      'dbData',
      'extension',
      'static'
    ],
    // 4. 图标设置（不同平台格式不同）
    icon: path.resolve(__dirname, 'public/favicon.ico'),
    overwrite: true, // 打包时覆盖已有文件（避免手动删除旧产物）
    prune: true, // 自动删除 node_modules 中未使用的文件（减小体积）
    appCopyright: "Copyright (C) 2024 My Company", // 版权信息
    appCategoryType: "Utility" // macOS 应用分类（仅 macOS 有效）
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        icon: path.resolve(__dirname, 'public/favicon.ico'),
        // 安装包图标，会显示在安装程序界面
        setupIcon: path.resolve(__dirname, 'public/favicon.ico')
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-deb',
      config: {}
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {}
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true
    })
  ],
  hooks: {
    // 打包完成后执行（在生成安装包之前）
    async postPackage(options, app) {
      const appPaths = app.outputPaths
      for (let appPath of appPaths) {
        // 定位 locales 目录（不同系统路径不同）
        let localesPath = ''
        if (process.platform === 'darwin') {
          // macOS: 应用包/Contents/Resources/locales
          localesPath = path.join(appPath, 'Contents', 'locales')
        } else {
          // Linux: 应用目录/resources/locales
          localesPath = path.join(appPath, 'locales')
        }
        const chromiumHtmlPath = path.join(appPath, 'LICENSES.chromium.html')
        // 确认目录存在
        const isExistFolder = await fs.access(localesPath).catch(() => true)
        if (isExistFolder) continue
        // 保留的文件列表
        const keepFiles = ['zh-CN.pak']
        const files = await fs.readdir(localesPath)
        await fs.unlink(chromiumHtmlPath)
        // 删除不需要的文件
        for (const file of files) {
          if (!keepFiles.includes(file)) {
            const filePath = path.join(localesPath, file)
            await fs.unlink(filePath)
          }
        }
      }
    }
  }
}
