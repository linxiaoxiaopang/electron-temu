---
name: image-name-grouping
overview: 在 Electron + Vue2 应用中新增「图片按名称分组」页面与菜单入口：递归扫描所选源文件夹中的图片，按去掉扩展名后的文件名分组，将同名图片复制或移动到独立输出目录下同名子文件夹，并提供进度与结果统计。
design:
  architecture:
    framework: vue
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 24px
      weight: 600
    subheading:
      size: 15px
      weight: 500
    body:
      size: 13px
      weight: 400
  colorSystem:
    primary:
      - "#4F46E5"
      - "#6366F1"
      - "#EEF2FF"
    background:
      - "#F7F8FC"
      - "#FFFFFF"
    text:
      - "#111827"
      - "#6B7280"
      - "#9CA3AF"
    functional:
      - "#10B981"
      - "#EF4444"
      - "#F59E0B"
      - "#4F46E5"
todos:
  - id: core-image-group
    content: 实现 background/utils/imageGroup.js 递归扫描、按名称分组、冲突命名与复制/移动执行
    status: completed
  - id: ipc-and-preload
    content: 新增 background/ipc/imageGroup.js 并在 main.js 注册目录选择、扫描、执行、取消 IPC 与进度推送
    status: completed
    dependencies:
      - core-image-group
  - id: preload-events
    content: 扩展 preload.js 的 electronAPI，新增 on/off 事件订阅能力
    status: completed
    dependencies:
      - ipc-and-preload
  - id: page-and-route
    content: 新增 src/views/imageGroup/index.vue 页面并注册 /image-group 路由，含目录配置、模式选择、预览、进度与结果
    status: completed
    dependencies:
      - ipc-and-preload
  - id: menu-entry
    content: 在 background/utils/view.js 新增「图片整理」菜单项与 loadRoute 方法，正确跳转 hash 路由
    status: completed
    dependencies:
      - page-and-route
  - id: verify-flow
    content: 校验边界场景（输出目录在源内、重名冲突、取消、空目录）并运行 ESLint 检查
    status: completed
    dependencies:
      - core-image-group
      - ipc-and-preload
      - preload-events
      - page-and-route
      - menu-entry
---

## 用户需求

在现有 Electron 桌面应用中新增一个「图片按名称分组」工具：用户选择一个大文件夹作为图片来源，程序递归扫描其中所有子文件夹里的图片，按「去掉扩展名后的文件名」分组，把同名的图片归入以该名称命名的文件夹，并输出到用户另行选择的独立输出目录，源目录保持只读。支持「复制」与「移动」两种处理模式。

## 产品概述

一个面向批量图片素材整理的单页工具。用户通过原生文件夹选择框指定源目录与输出目录，先扫描预览分组情况，确认后执行归档，执行过程中可查看实时进度并可取消，结束后展示分组数、成功数、失败数与失败明细。

## 核心功能

- **目录选择**：分别选择源图片大文件夹与独立输出目录，选择后展示完整路径，输出目录不可位于源目录内部。
- **递归扫描**：遍历源目录所有层级，仅识别常见图片格式（jpg/jpeg/png/webp/gif/bmp/svg/avif/heic），自动跳过隐藏目录与输出目录本身。
- **按名称分组**：以去扩展名的文件名作为分组键（Windows 下忽略大小写），同名图片归入同一文件夹，文件夹名取首次出现的原始名称。
- **扫描预览**：执行前展示图片总数、分组总数、重复组列表（组名与图片数量），并可选择「单张图片也单独建文件夹」，默认仅归档出现 2 张及以上的分组。
- **复制与移动**：单选切换处理模式；移动模式给出不可逆提示；目标文件同名同扩展名时自动追加序号，不覆盖已有文件。
- **执行与进度**：开始后展示进度条、已完成/总数、当前处理文件，支持中途取消；单文件失败不中断整体流程。
- **结果反馈**：结束后展示分组数、成功数、失败数、跳过数，并以列表形式展示失败文件路径与失败原因。

## 技术栈

- 桌面端：Electron 37（现有）
- 渲染层：Vue 2.6 + Vue Router 3（hash 模式）+ Vuex（现有），Options API
- 样式：原生 CSS（项目未引入组件库，不新增依赖）
- 主进程能力：Node.js 原生 fs / fs.promises / path，Electron dialog、webContents.send
- IPC：沿用项目既有 `customIpc`（`background/utils/event.js`）+ preload `contextBridge`

## 实现方案

文件操作全部放在主进程完成（渲染进程处于 `contextIsolation: true`，不应直接触碰文件系统），渲染层只负责交互与展示。

核心分为三层：

1. **纯逻辑层** `background/utils/imageGroup.js`：负责递归扫描、分组、生成归档计划、执行复制/移动，不依赖 Electron API，便于复用与后续扩展（如按尺寸/日期分组）。
2. **IPC 适配层** `background/ipc/imageGroup.js`：注册文件夹选择、扫描、执行、取消四类 invoke 通道，并通过 `mainWindow.webContents.send` 推送进度事件。
3. **页面层** `src/views/imageGroup/index.vue`：状态机式界面（未选择 → 已选目录 → 已扫描 → 执行中 → 已完成），通过 `window.electronAPI.invoke` 调用主进程。

### 关键决策

- **分组键大小写不敏感**：Windows 文件系统大小写不敏感，`A.jpg` 与 `a.png` 若分别建文件夹会在同一目录下冲突，因此分组 key 统一 `toLowerCase()`，文件夹名使用首次出现的原始 basename。
- **扫描采用迭代队列而非递归函数**：避免深层目录导致调用栈溢出；使用 `fs.promises.readdir(dir, { withFileTypes: true })`，跳过符号链接与以 `.` 开头的目录。
- **输出目录必须排除在扫描范围外**：若输出目录位于源目录内部则直接拒绝执行，同时扫描阶段也跳过输出目录路径，避免边扫描边写入造成自包含死循环。
- **移动实现**：优先 `fs.promises.rename`（同盘瞬时完成），捕获 `EXDEV` 错误后回退为 `copyFile + unlink`；跨盘移动因此仍然可用。
- **冲突处理**：目标分组内若已存在同名文件，依次尝试 `name_1.ext`、`name_2.ext`，不覆盖用户已有文件；计划阶段即确定最终目标名，执行阶段按计划写入。
- **进度推送节流**：按分组推进，最多每 100ms 通过 `webContents.send('imageGroup:progress', payload)` 推送一次，避免大目录下 IPC 洪泛导致渲染卡顿。
- **取消机制**：主进程维护任务级 `cancelled` 标志，每个分组开始前检查；取消后返回已完成的统计与剩余数量，已写入的文件不回滚（界面明确提示）。
- **性能**：扫描与分组为 O(n)（n 为文件数），仅做一次目录遍历；执行阶段按分组串行、组内文件并行，磁盘 IO 顺序更稳定，内存仅保留文件路径元数据（万级图片约数 MB），不读取文件内容。

### 数据流

```mermaid
flowchart LR
  A[页面 选择目录] --> B[invoke imageGroup:selectDirectory]
  B --> C[主进程 dialog 返回路径]
  C --> D[invoke imageGroup:scan]
  D --> E[imageGroup.js 递归扫描并分组]
  E --> F[返回预览统计]
  F --> G[invoke imageGroup:start]
  G --> H[复制或移动文件]
  H --> I[webContents.send 进度事件]
  I --> J[页面刷新进度与结果]
```

## 实现要点

- **IPC 通道约定**（新增，统一前缀 `imageGroup:`）
- `imageGroup:selectDirectory`：入参 `{ title }`，返回 `{ path }` 或 `{ cancelled: true }`
- `imageGroup:scan`：入参 `{ sourceDir, outputDir }`，返回 `{ total, groupCount, duplicateGroups, singleCount }`
- `imageGroup:start`：入参 `{ sourceDir, outputDir, mode, includeSingle }`，返回 `{ groups, success, failed, skipped, cancelled, failures }`
- `imageGroup:cancel`：无入参，设置取消标志
- 推送事件 `imageGroup:progress`：`{ current, total, groupName, phase }`
- **preload 扩展**：在现有 `electronAPI` 上新增 `on(channel, callback)` 与 `off(channel, callback)`，内部使用 `ipcRenderer.on/removeListener`，回调只透传数据对象，不暴露 `event`，避免泄露 `ipcRenderer`。
- **菜单跳转**：`background/utils/view.js` 的 `loadUrl` 直接拼接 hash 会被 `path.resolve` 破坏，需新增 `loadRoute(hash)`：开发环境 `loadURL(indexPath + '#' + hash)`，生产环境 `loadFile(path.resolve(app.getAppPath(), indexPath), { hash })`；点击菜单时先 `mainWindow.show()` 再跳转。
- **错误处理**：主进程每个 IPC handler 使用 try/catch 返回 `{ error: message }`（与 `main.js` 中 `proxyRequest` 一致）；单文件失败记录 `{ path, message }` 后继续。
- **安全与边界**：校验源/输出目录均存在且为目录；拒绝输出目录等于或位于源目录内部；拒绝源目录位于输出目录内部；空目录、无图片时给出明确提示而非报错。
- **不改动现有逻辑**：`/express` 页面、Express 服务、Sequelize 模型均不涉及；仅在 `main.js` 增加一行 IPC 注册调用、`preload.js` 增加事件订阅方法、`view.js` 增加一个菜单项。

## 设计风格

采用「现代极简 + 轻量玻璃质感」的浅色工具型界面：大面积留白、圆角卡片、柔和投影与克制的靛蓝主色，与现有页面的简洁风格保持一致但更具品质感。整体为单页纵向布局，信息层级由「目录配置 → 模式选择 → 扫描预览 → 执行进度 → 结果明细」自上而下递进，每一步都给出明确的状态反馈。

## 页面规划

仅一个页面 `/image-group`，顶部为固定导航栏（应用名 + 页面标题 + 状态徽标），主体为居中最大宽度 960px 的内容区，底部为操作栏（开始/取消/重新开始）。

### 页面区块

1. **顶部导航栏**：左侧标题「图片按名称分组」与副标题说明；右侧展示当前阶段徽标（待配置/已就绪/执行中/已完成），滚动时保持吸顶并带轻微毛玻璃。
2. **目录配置卡片**：两行路径选择项，每行左侧为图标与标签，中间为等宽字体路径文本（未选择时显示占位提示），右侧为「选择文件夹」按钮；路径过长时中间省略，悬停显示完整路径。
3. **模式与选项卡片**：复制/移动两个可点击的选项卡（选中态带主色边框与淡色底），移动模式旁显示橙色风险提示；下方为「单张图片也单独建文件夹」开关与图片格式说明文字。
4. **扫描预览卡片**：点击「扫描」后展示三项数字指标（图片总数、分组数、可归档组数）与重复组标签列表，标签显示「组名 × 数量」，超过 8 个折叠为「展开全部」。
5. **执行进度卡片**：横向进度条带渐变填充与百分比，下方为「已完成 / 总数」与当前处理的组名；执行中「开始」按钮变为「取消」，并显示旋转指示器。
6. **结果明细卡片**：四宫格统计（分组、成功、失败、跳过），失败项以可滚动的紧凑列表展示文件名与原因；全部成功时展示绿色勾选图标与完成文案。

## 交互与动效

- 卡片进入使用 200ms 淡入上移动画，指标数字变化使用 300ms 计数过渡。
- 按钮 hover 时主色加深并轻微上浮，点击有 0.98 缩放反馈；禁用态降低不透明度并禁用指针。
- 进度条宽度变化使用 300ms 缓动，执行中进度条带流动光效。
- 扫描与执行期间禁用目录与模式选择，避免状态错乱；执行完成后提供「重新开始」重置入口。
- 移动模式在点击开始时弹出二次确认，明确提示原文件将从源目录移除。

## 响应式

桌面优先，宽度小于 900px 时卡片内边距收窄、目录行改为上下堆叠、按钮占满整行；最小支持 800×600 窗口尺寸且不出现横向滚动。