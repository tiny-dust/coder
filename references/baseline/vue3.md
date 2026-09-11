# Vue 3 规范

适用：`.vue` 文件与 Vue 项目结构。SFC 文件内顺序见 `sfc-structure.md`；先读 `principles.md`。

## 目录（硬性）

- 页面专属组件：`src/pages|views/<页面>/components/`。
- 被 **2+ 页面**实际复用：才提升到 `src/components/business/`。
- 二次封装的 UI 基础组件：`src/components/base/`。
- `src/components/ui/`：只允许 shadcn CLI 生成；手写组件一律不进。
- 业务代码禁止裸用原生交互元素（`button`/`input`/`select` 等）——优先 UI 库/已封装组件；没有就先封装再用。纯布局元素（`div`/`section`）不受限。
- UI 库组件第一次使用时即按设计稿封装。

## Hook 抽取时机（硬性）

- **禁止**第一时间创建 `useXxx`。
- 逻辑先写在组件函数区；只有同时满足「已被 2+ 组件实际复用」且「与响应式状态耦合」才抽 composable。
- 纯逻辑去 utils，不要写成 hook。

## 子组件提取时逻辑随迁（硬性）

拆 UI 区块为子组件时：

- 只服务该区块的状态、`ref`、`watch`、DOM 查询（如滚动容器 `ref` + `scrollIntoView`）必须**随迁到子组件**。
- 父组件只保留跨区块协调（`emit` 上抛、共享数据加载）。
- 自查：这段逻辑删掉后子组件还能用吗？能 → 归属子组件。对应模板容器一并随迁。

## 状态与 computed

- `ref` 管原始值或需整体替换的状态；`reactive` 管多字段始终一起用的对象；一个组件优先一种主写法。
- `computed` 仅用于依赖响应式值且需缓存派生；静态转换用普通纯函数。
- computed 必须纯函数：禁止请求、改状态、写 store、弹 toast。
- 一个 computed 一个业务概念，语义命名（`completedTodos`、`canSubmit`）。
- getter 超约 10 行、3+ 独立判断、或依赖 4+ 状态 → 拆中间 computed/纯函数。
- 默认只读 getter；禁止为省一个 `ref` 用 `computed({ get, set })`。仅第三方组件强约束 v-model 适配时例外，并加一句注释。
- 模板中超一行的派生/嵌套三元 → 提取具名 computed/纯函数。

## 可访问性基础

- 每个表单控件有可访问名称（`label` 或 `aria-label`）。
- 纯图标按钮必须有 `aria-label`。
- 列表/内容为空时渲染可见空态文案。

## vue-i18n 字典（硬性，项目启用时）

- 字典**只用 JSON 文件**维护（`src/locales/` 或 `i18n/locales/`）；禁止写在 `.ts`/`.js` 对象或 SFC `<i18n>` 块——JSON 才能被 i18n Ally 等插件解析与悬浮预览。
- 按语言分文件（`zh-CN.json`、`en.json`）；命名空间大时用 `{namespace}/{locale}.json`。
- key 用嵌套风格 `{"user":{"login":"登录"}}`；禁止中文/拼音当 key。
- 源语言补全后再补其他语言；新增 key 同步所有语言文件。
- 插件未识别路径时，提交 `.vscode/settings.json` 配置 `i18n-ally.localesPaths` 与 `i18n-ally.pathMatcher`。

## 依赖清理

- 未引用的文件/导出/依赖一律删除；先过自动导入例外：`auto-imports.d.ts`、`components.d.ts`、`typed-router.d.ts` 中的符号视为可能在用，grep 业务源码确认后再删。
- 删文件/函数 → 同步删 import；删依赖 → uninstall 前全局 grep。
- 清理后必须重跑 build/dev；出现 `Cannot find name` / `Failed to resolve import` / 组件未注册 → 恢复。
- 无显式 import ≠ 未使用（副作用导入、模板自动注册）。

## 项目初始化要点

- **vue-router 5 文件路由**（推荐）：`vite.config.ts` 中 `VueRouter()` 必须在 `vue()` 之前；`main.ts` 使用 `import { routes } from 'vue-router/auto-routes'`；页面在 `src/pages/`（`index.vue`→`/`，`[id].vue`→`:id`，`[...all].vue`→404，`(group)/` 不改 URL）。首次生成的 `typed-router.d.ts` 提交并加入 `tsconfig.app.json` include。**禁止 unplugin-vue-router**（已归档）。
- **pinia**：最新版；`pinia-plugin-persistedstate` 需问询用户。store 只存跨组件共享数据；单页一次性状态留在组件内。
- **最小化安装**：只装确认选型的库，不擅自加 ESLint/测试/CI 等需求外配置。

## 子技能

- 新建项目/选型：`vue3-project-init`
- 页面与功能：`vue3-dev`
- 测试 / Pinia / Router：对应 best-practices 技能
- shadcn-vue：`shadcn-vue`（critical rules 强制）
