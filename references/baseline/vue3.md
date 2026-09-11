# Vue 3 规范

适用：`.vue` 文件与 Vue 项目结构、新建项目、依赖清理。SFC 文件内顺序见 `sfc-structure.md`；先读 `principles.md`。原 `vue3-dev` / `vue3-deps` / `vue3-project-init` 技能知识已收拢于此，不再外部分派。

## 开发任务要点

1. 先 `query.js` 查同名/相似组件与工具函数；命中后读源码再动手。
2. 规划复用：已有项目组件/函数 > 第三方（优先 rattail）> 新建。与已有实现在职责/入出参/场景上高度相似时默认扩展，不新建。
3. 最小实现：需求说什么就做什么；登录就是登录，不主动加注册/验证码。
4. API 调用保持朴素：`loading → await api → 成功分支 → finally 复位`。
5. 完成后 `--refresh` + `--check`；构建通过 ≠ 交互正确，条件允许 dev 实测。

## 目录（硬性）

| 组件类型 | 归属 |
| --- | --- |
| 页面专属业务组件 | `src/pages\|views/<页面>/components/` |
| 被 2+ 页面实际复用的业务组件 | `src/components/business/` |
| 二次封装 UI 基础组件 | `src/components/base/` |
| shadcn CLI 生成组件 | `src/components/ui/`（**仅 CLI**，手写一律不进） |

- 视图目录随路由方式：文件路由用 `src/pages/`，声明式路由用 `src/views/`，项目内保持一致。
- 迁移：`business/` 下仅单页使用的组件 → 移回对应视图目录 `components/`。
- 业务代码禁止裸用原生交互元素（`button`/`input`/`select`/`textarea`/`table`/`form`/`checkbox` 等）。

### UI 元素判定顺序

1. 查项目 UI 库 / 已封装 base 组件是否已有。
2. 有 → 用封装组件（禁止在业务里给 UI 库原始组件堆大量 props/class）。
3. 没有 → 按设计稿封装到 `base/` 或页面 `components/`，业务只用封装结果。
4. 纯布局/语义元素（`div`/`section`/`ul` 等）可直接用。
5. UI 库组件**第一次**使用时即封装，不等用了很多处再回头。

### ui/ 红线

- 只有 `npx shadcn-vue add` 安装的组件进 `ui/`。
- 手写、像 shadcn、从 registry 复制的一律放 `base/` 或视图目录。
- 历史遗留手写组件在 `ui/` → 迁出。

### shadcn-vue 高频约束（项目启用时加载 `$skill: shadcn-vue`）

- 条件类用 `cn()`；禁止 `:class="x && '...'"`。
- v-model 优先于手写事件。
- 间距用 `flex gap-*`，禁止 `space-y-*`。
- 纯图标按钮必须 `aria-label`。

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
- 同源数组多项统计：小列表以可读性优先（可拆多个 computed）；大列表可一次遍历聚合。

## 错误处理（与 error-handling.md 配套）

- 业务代码禁止 try/catch；`finally` 复位 loading 允许。
- 工具函数转换错误后必须重抛，禁止吞错。
- 拦截器统一处理网络/状态码/业务 code/token 过期；同一错误提示逻辑若要在 2+ 业务函数重复写，说明它属于拦截器。

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

## 依赖清理（硬性）

清理对象：未引用的文件、未使用的导出、`package.json` 中无代码 import 的依赖、文件内无调用方的私有函数。

**自动导入例外（关键）**：

| 声明文件 | 插件 |
| --- | --- |
| `auto-imports.d.ts` | unplugin-auto-import |
| `components.d.ts` | unplugin-vue-components |
| `typed-router.d.ts` | vue-router 5 文件路由 |

- 源码无显式 import ≠ 未使用：出现在上述 `.d.ts` 且业务源码有实际调用 → 保留。
- `.d.ts` 声明本身不算「使用」；以 `.vue`/`.ts` 业务文件中的实际调用为准。
- 流程：列候选 → 排除自动导入 → 删代码与 import → 删依赖前全局 grep → 重跑 build/dev。
- 报错 `Cannot find name` / `Failed to resolve import` / 组件未注册 → 说明仍被使用，恢复。

## 项目初始化（新建 Vue3 工程）

核心：**先问询后搭建，配置最小化，库用最新版**。

### 选型（依次问询）

1. **UI 库**：shadcn-vue / element-plus / ant-design-vue / naive-ui / 其他；后续二次封装基于该库。
2. **路由**：
   - **vue-router 5 文件路由（推荐）**：`vite.config.ts` 中 `VueRouter()` **必须在 `vue()` 之前**；`main.ts` 用 `import { routes } from 'vue-router/auto-routes'`；页面在 `src/pages/`（`index.vue`→`/`，`[id].vue`→`:id`，`[...all].vue`→404，`(group)/` 不改 URL）。首次 dev/build 生成 `typed-router.d.ts` 提交并加入 `tsconfig.app.json` include，`moduleResolution: "Bundler"`。**禁止 unplugin-vue-router**（已归档，与 vue-router 5 不兼容）。
   - 声明式路由：手写 `createRouter` + routes，适合特殊逻辑或存量项目。
3. **pinia**：最新版；是否要 `pinia-plugin-persistedstate` 需问询。store 只存跨组件共享数据；单页一次性状态留在组件内；创建前先问「有没有第二个消费者？」。
4. **工具链**：未指定第三方时默认 rattail（见 `rattail.md`）。

### 脚手架与目录骨架

```bash
npm create vite@latest <name> -- --template vue-ts
```

按选型安装 UI 库 / vue-router@5 / pinia / rattail。只装确认选型的库，不擅自加 ESLint/测试/CI。

```text
src/
  pages/ 或 views/     # 视图/页面
  components/base/     # 二次封装基础组件
  components/business/ # 多页面复用业务组件
  components/ui/       # 仅 CLI 生成
  utils/               # 工具函数（rattail 优先）
  lib/                 # createAxle、cn 等基础设施
  stores/              # pinia
```

### 初始化验证

- `npm run build` 通过。
- `/` 路由可访问。
- 技能索引：`query.js --init` + `--refresh`。

## 运行时验证（完成任务后，鼓励）

构建通过 ≠ 交互正确：

1. 首选：`npm run dev` + 浏览器实测关键交互（增删改、路由、跨页共享）。
2. 备选：`dist/` + `vite preview` + headless 浏览器冒烟；注意后台路由可能不重绘，必要时加 `--disable-renderer-backgrounding` 或用 store 断言。
3. 验证失败：先怀疑环境（端口/后台回收），再怀疑代码。

## 相关技能

- shadcn-vue：`$skill: shadcn-vue`（critical rules 强制）
- 工具链细节：`$skill: rattail`
- Vue 测试 / Pinia / Router：对应 best-practices 技能
- **不再使用**已删除的 `vue3-dev` / `vue3-deps` / `vue3-project-init`
