---
name: image-group-review-sort
overview: 在「扫描预览」与「开始整理」之间新增逐组图片审核：按 -1、-2 后缀顺序展示每组图片，支持拖拽/上下箭头排序与删减，归档时按审核结果重命名为 组名-1、组名-2 并跳过被删减的图片。
design:
  architecture:
    framework: vue
  styleKeywords:
    - 浅色渐变
    - 圆角卡片
    - 紫色主色
    - 缩略图网格
    - 拖拽排序
  fontSystem:
    fontFamily: PingFang-SC
    heading:
      size: 16px
      weight: 600
    subheading:
      size: 13px
      weight: 500
    body:
      size: 12px
      weight: 400
  colorSystem:
    primary:
      - "#4F46E5"
      - "#EEF2FF"
      - "#3730A3"
    background:
      - "#F7F8FC"
      - "#FFFFFF"
      - "#FBFBFE"
    text:
      - "#111827"
      - "#6B7280"
      - "#9CA3AF"
    functional:
      - "#10B981"
      - "#EF4444"
      - "#F59E0B"
      - "#E8EAF3"
todos:
  - id: preview-files
    content: 主进程组内自然排序，预览返回每组文件清单与 fileUrl，并加组数/组内张数上限
    status: completed
  - id: archive-plan
    content: 归档支持 plan 参数与路径校验，按 组名-N 重命名、跳过删减并返回 excluded
    status: completed
    dependencies:
      - preview-files
  - id: review-card
    content: 新增 ReviewCard 组件与 igp-review 样式：缩略图网格、拖拽+箭头排序、删减撤销、组间导航
    status: completed
    dependencies:
      - preview-files
  - id: wire-review
    content: mixin 增加 review 状态与 buildPlan，index.vue 接入审核卡片与按钮流转
    status: completed
    dependencies:
      - archive-plan
      - review-card
  - id: update-copy
    content: 更新 PreviewCard 重命名提示、ResultCard 步骤编号与删减统计
    status: completed
    dependencies:
      - wire-review
---

## 产品概览

在「图片按名称分组」工具中，扫描完成后先逐组审核图片顺序与取舍，再执行归档。审核结果直接决定归档时复制/移动哪些图片、以及图片的最终命名顺序。

## 核心功能

- 扫描完成后按分组顺序进入逐组审核：先展示第 1 组，可「上一组 / 下一组」循环浏览全部组，顶部显示「第 N / 总数 组」与组名
- 组内图片按文件名末尾序号（-1、-2、-10）自然排序展示，每张显示缩略图、当前序号徽标、文件名
- 排序：支持拖拽缩略图调整位置，同时提供上移/下移按钮；排序结果即最终命名顺序
- 删减：可移除组内某张图片并支持撤销；被删减的图片不参与复制/移动，源文件保持原位不动
- 归档命名：统一改为「组名-1、组名-2…」，保留原扩展名；组内被删减后序号连续重排
- 组内全部删减时该组不生成输出文件夹，并给出提示
- 未审核的组默认按原顺序全部保留，可直接开始整理
- 归档结果区显示实际归档张数与被删减张数；Excel 仍按归档后文件夹内容生成（默认每组前 3 张）

## 视觉与交互效果

- 沿用现有页面的浅色渐变背景、白色圆角卡片、紫色主色调与 01-05 步骤编号体系
- 审核卡片为缩略图网格：图片 1:1 裁切圆角展示，左上角序号徽标，hover 浮起并显示拖拽手柄、上移/下移/删除按钮
- 拖拽时目标位置显示插入高亮线，被拖卡片半透明；删除后卡片变灰并显示「已删减 / 撤销」
- 底部为组间导航（上一组 / 下一组 / 完成审核）与剩余图片数提示，操作即时生效

## 技术栈

- Electron 主进程（Node.js `fs` / `path` / `url.pathToFileURL`）
- 渲染层 Vue 2 Options API + 现有 `src/views/imageGroup/style.css`（`igp-` 前缀）
- 复用 `exceljs`（已有依赖）生成表格；不新增任何第三方依赖（拖拽用原生 HTML5 Drag & Drop）
- 无测试框架，不新增测试；验证方式为 Node 脚本 + `npm run build`

## 实现方案

### 1. 主进程：分组排序与文件清单

`background/utils/imageGroup.js`

- 新增 `naturalCompare(a, b)`：`a.localeCompare(b, 'zh-CN', { numeric: true })`，在 `groupImages` 内对每组 `files` 排序，保证 `-1、-2、-10` 顺序正确（同时统一归档顺序）
- `previewImageGroups` 增加 `includeFiles` 参数（默认 `true`），返回：
- `groups[].files = [{ name, path, fileUrl, ext, size }]`，`fileUrl` 由 `pathToFileURL(filePath).href` 生成，渲染层直接用于 `<img>`（已确认 `main.js` 中 `webSecurity: false`，`file://` 可加载）
- 保留 `name`、`count`、`groupsTruncated`
- 新增 `filesTruncated`（存在组内图片数超上限）
- 上限控制：组数沿用 `PREVIEW_GROUP_LIMIT = 200`；新增 `PREVIEW_FILE_LIMIT = 30`（每组最多返回 30 个文件条目），超出部分不参与审核排序，归档时按原顺序追加。控制 IPC 载荷（最坏 200×30 条 ≈ 1.5MB）

### 2. 主进程：按审核计划归档 + 统一重命名

- 新增 `normalizePlan(plan, sourceDir)`：校验并规整为 `[{ name, files: [path] }]`
- `path.resolve(item.path)` 必须位于 `sourceDir` 之下（`startsWith(source + path.sep)`），否则抛错，防止越权读写
- 文件必须存在且 `isImageFile`，否则跳过并计入失败明细
- 组名做 `path.basename` 清洗，禁止 `..`、路径分隔符
- `runImageGroups` 新增 `plan` 参数：
- 有 `plan`：按 plan 的组顺序与组内顺序归档；`total` = plan 保留张数；新增 `excluded` = 计划中被删减张数
- 无 `plan`：沿用 `collectImages + groupImages`（向后兼容）
- 目标文件名统一为 `` `${group.name}-${index + 1}${path.extname(filePath)}` ``，再交给现有 `resolveTargetPath` 处理重名（追加 `_1`）
- 组内计划为空则不建目录、不进入 `archived`，`excluded` 统计该组被删减数
- 进度回调沿用 `onProgress({ current, total, groupName, phase })`

### 3. IPC 层

`background/ipc/imageGroup.js` 无需改动：`imageGroup:scan` 与 `imageGroup:start` 均已 `...args` 透传，新增的 `includeFiles`、`plan` 自动生效；错误仍以 `{ error: message }` 返回。

### 4. 渲染层：审核状态与交互

`src/views/imageGroup/mixins/groupTask.js`

- 新增 `review` 状态：

```js
review: { active: false, index: 0, groups: [{ name, files: [{ path, name, fileUrl, removed }] }] }
```

- 方法：`enterReview(preview)`（由 `scan()` 成功后调用）、`moveFile(groupIndex, from, to)`、`moveBy(groupIndex, index, delta)`、`toggleRemove(groupIndex, index)`、`gotoGroup(delta)`、`resetGroup(groupIndex)`、`buildPlan()`、`keptCount` / `excludedCount` 计算属性
- `plannedCount` 改为：审核激活时取审核后的保留张数，否则取 `preview.plannedFiles`
- `runTask()` 提交参数新增 `plan: this.buildPlan()`
- `resetPreview()` 同时清空 `review`

`src/views/imageGroup/components/ReviewCard.vue`（新增）

- 顶部：步骤编号 04、组名、`第 N / M 组`、保留/删减计数
- 主体：缩略图网格，`draggable="true"` + `dragstart/dragover/drop/dragend` 实现插入排序（`dragIndex`、`dropIndex` 两个 data，`drop` 时 `splice` 移动），每项含上移/下移/删除按钮（首尾按钮禁用）
- 图片：`<img :src="file.fileUrl" loading="lazy" decoding="async" @error="onImageError">`，加载失败显示文件名占位
- 底部：上一组 / 下一组 / 本组恢复默认；组内超 30 张时提示「仅展示前 30 张，其余按原顺序归档」
- 纯展示组件，全部操作以事件上抛（`move`、`remove`、`goto`、`reset`）

`src/views/imageGroup/index.vue`

- 在 `PreviewCard` 之后、`ProgressCard` 之前插入 `<ReviewCard v-if="review.active" ... />`
- 按钮区：审核激活时「开始整理」前增加「跳过审核」链接（`review.active = false`）
- 移动模式确认弹窗文案补充「被删减的图片不会移动」

### 5. 文案与结果

- `PreviewCard.vue`：提示改为「归档时按审核顺序重命名为 组名-1、组名-2…」
- `ResultCard.vue`：步骤编号改 05，指标增加「已删减」；提示「被删减的图片未复制/移动，源文件保持原位」
- `index.vue` 头部副标题补充审核流程说明

### 性能与可靠性

- 扫描返回文件清单受组数/组内张数双重上限约束；渲染端网格最多渲染 30 张，`loading="lazy"` 避免一次性解码大量原图（单组 1000px 图约 4MB 解码内存/张）
- 排序/删减全部在前端数组操作，O(n)，无文件 IO
- 归档仍串行逐文件处理，避免并发句柄耗尽；失败明细沿用 `FAILURE_LIMIT = 500`
- 重命名冲突、跨盘移动（`EXDEV` 回退）沿用现有逻辑

### 向后兼容

- 不传 `plan` 时行为等价于「全部保留 + 原顺序 + 新命名规则」
- 现有 `imageLimit`、`keyword`、`mode`、Excel 生成逻辑不变；Excel 从输出文件夹读取，重命名后自然排序即为审核顺序

## 架构设计

```mermaid
graph LR
  A[渲染层 ReviewCard] -->|拖拽/箭头/删减| B[groupTask mixin review 状态]
  B -->|imageGroup:scan includeFiles| C[主进程 previewImageGroups]
  C -->|groups[].files + fileUrl| B
  B -->|imageGroup:start plan| D[主进程 runImageGroups]
  D -->|normalizePlan 校验| E[按组名-N 重命名 + 跳过删减]
  E --> F[输出目录 -copy/-move]
  F --> G[writeGroupWorkbook 生成表格]
```

数据流：扫描 → 返回组与组内文件（含 fileUrl）→ 渲染层审核（排序/删减，仅内存）→ 提交 plan → 主进程校验并归档 → 生成 Excel。

## 目录结构

```
electron-temu/
├── background/
│   ├── utils/
│   │   └── imageGroup.js          # [MODIFY] 组内自然排序；previewImageGroups 返回 files/fileUrl 与上限；
│   │                              #          新增 normalizePlan 安全校验；runImageGroups 支持 plan、
│   │                              #          统一重命名为 组名-N、跳过删减、返回 excluded
│   └── ipc/
│       └── imageGroup.js          # [不改] args 已透传 includeFiles / plan
├── src/views/imageGroup/
│   ├── index.vue                  # [MODIFY] 接入 ReviewCard、审核激活时的按钮流转、移动确认文案、头部说明
│   ├── style.css                  # [MODIFY] 新增 .igp-review-* 样式：网格、缩略图卡、序号徽标、
│   │                              #          拖拽插入高亮、已删减态、组导航条、移动端两列自适应
│   ├── mixins/
│   │   └── groupTask.js           # [MODIFY] review 状态与排序/删减/组切换方法、buildPlan、
│   │                              #          plannedCount 改为审核后保留数、start 传 plan
│   └── components/
│       ├── ReviewCard.vue         # [NEW] 逐组审核卡片：缩略图网格、HTML5 拖拽 + 上移/下移、
│       │                          #       删减/撤销、上一组/下一组、图片加载失败占位
│       ├── PreviewCard.vue        # [MODIFY] 重命名规则与审核流程提示文案
│       └── ResultCard.vue         # [MODIFY] 步骤编号 05、新增「已删减」指标与说明
```

## 关键数据结构

```js
// 预览返回（每组）
{ name: 'YSFJ5575', count: 5, files: [{ name: 'YSFJ5575-1.jpg', path: 'D:\\...', fileUrl: 'file:///D:/...', ext: '.jpg', size: 12345 }] }

// 归档提交（plan）
{ plan: [{ name: 'YSFJ5575', files: ['D:\\...\\YSFJ5575-2.jpg', 'D:\\...\\YSFJ5575-1.jpg'] }] }
```

## 设计风格

沿用现有图片分组页的设计语言：浅色渐变背景（紫/绿柔光晕）、白色圆角卡片、紫色主色 `#4F46E5`，卡片间距与 01-05 步骤编号体系一致。新增「逐组审核」卡片为步骤 04，风格与 DirectoryCard / ModeCard / PreviewCard 完全统一。

## 页面结构（审核卡片）

- **卡片头部**：标题「逐组审核」+ 副标题「拖拽或使用箭头调整顺序，序号即最终命名」+ 右侧步骤编号 04
- **组信息条**：左侧大号组名，右侧「第 3 / 12 组」徽标；下方细进度条展示当前组在全部组中的位置
- **缩略图网格**：自适应列（最小 132px），每格为 1:1 圆角缩略图；左上角半透明序号徽标（1、2、3…），底部一行文件名（超长省略），hover 时浮起 2px 并显示右上角拖拽手柄
- **操作浮层**：每格底部出现三个图标按钮——上移、下移、删除；首尾项对应按钮置灰
- **删减态**：卡片变灰、图片降透明度并叠加斜线，底部显示「已删减」+「撤销」文字按钮
- **组内导航**：底部一行左「上一组」、中「第 N / M 组 · 保留 4 张 / 已删减 1 张」、右「下一组」；最右侧次要按钮「本组恢复默认」
- **拖拽反馈**：拖动项半透明并轻微缩放，目标位置显示 2px 紫色插入竖线；松手即完成位置交换，无动画延迟感

## 交互细节

- 拖拽基于原生 HTML5 DnD，`dragover` 实时更新插入位置，`drop` 完成移动；键盘可用上下箭头按钮替代
- 所有操作即时生效且可逆（删减可撤销、单组可恢复默认），无需二次确认
- 组切换带 120ms 淡入，避免生硬跳变
- 图片懒加载，加载失败显示灰色占位与文件名；组内超过 30 张时顶部提示仅展示前 30 张

## 响应式

- ≥720px：网格 4-6 列；<720px：2-3 列，组导航改为两行堆叠，按钮占满宽度