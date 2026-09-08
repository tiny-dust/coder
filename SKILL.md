---
name: coder
description: 一切开发任务的总入口——只要任务涉及编写、修改、审查、调试或重构代码（不限语言和文件类型），必须先加载本技能。Vue 3 与 TypeScript 是当前内置规则的场景（.vue 使用 SFC 结构规范；.ts 复用相同的先查后写、类型优先、最小改动流程），其他语言按通用开发流程处理。铁律（每次任务必须遵守，优先级最高）：禁止过度设计与过度开发，永远用最简方式实现当前需求；发现逻辑 bug 时先完成当前开发，再与用户确认是否修复。首次在项目中使用时，先用 AskUserQuestion 询问用户是否安装最佳开发范式（--init 深度调查项目栈），允许后才执行。开发前优先运行 scripts/query.js 按名称查询已有组件和工具函数（索引超过 300 条自动启用 SQLite 模式），避免全量读取项目文档和重复造轮子。复杂场景再分派到 vue3-project-init、vue3-dev 或 vue3-deps。
---

# Coder

## 适用范围（必须遵守）

**只要任务是开发——编写、修改、审查、调试、重构任何代码——都必须先加载本技能**，不限语言与文件类型：

- `.vue` / `.ts`：使用本技能内置的完整规则（后缀路由见下节）。
- 其他语言/文件类型：本技能的工作流仍然生效（查询优先、铁律、最小实现、验证），但**不要套用 Vue 特定规则**（SFC 结构等），按该语言的项目惯例执行。

一句话：coder 是所有开发任务的第一入口，先加载它，再按后缀决定用哪套细节规则。

## 铁律（优先级最高，每次任务必须遵守）

**禁止过度设计与过度开发。永远用最简洁的方式实现当前需求**：不做需求外的抽象、配置项、策略模式；不为"未来可能"写代码；能一行就不写三行；新逻辑优先加入已有文件而非新建。发现逻辑 bug 时，先完成当前开发任务，然后**与用户确认是否修复**，不擅自扩大改动范围。

## 首次使用引导（每个项目一次）

第一次在某个项目中使用本技能、且项目根目录没有 `.coder/profile.json` 时：

1. 用 AskUserQuestion 询问用户：**是否安装本项目的最佳开发范式？**（选项：安装 / 跳过）
2. 用户允许后，运行深度调查并生成范式档案：

```bash
node ~/.agents/skills/coder/scripts/query.js --root <项目根目录> --init
```

脚本自动检测框架与版本（Vue/React/Svelte）、构建器（Vite 等）、路由（vue-router）、UI 库（Element Plus/shadcn-vue 等）、状态库（Pinia 等）、TypeScript 与语言版本、文件类型分布和工具链（oxlint/oxfmt/vitest），写入 `.coder/profile.json`。

3. **依据 profile.json 结合 references 确定该项目的开发范式**：框架版本对应的 SFC/组合式 API 写法、文件类型对应的规则集（`.vue` → SFC 结构；`.ts` → 类型优先）、UI 库封装约定。向用户简述确认后的范式，然后才进入开发。
4. 用户跳过时：不做栈检测，按 references 的通用 Vue/TS 规则开发，之后不再重复询问。

## 文件后缀路由

- `.vue`：加载 `references/sfc-structure.md`，遵守 Vue 3 `<script setup>`、模板、样式和组件接口规则。
- `.ts`：复用本技能的查询、复用优先、类型优先、错误处理和验证规则；工具函数优先查询第三方依赖与项目已有导出。
- 同一任务同时修改 `.vue` 与 `.ts`：使用同一套工作流，按文件后缀叠加规则，不拆成相互矛盾的流程。
- 其他后缀（`.py`、`.go`、`.java` 等）：使用本技能的通用工作流（查询优先、铁律、最小实现、验证），不套用 Vue 规则；按该语言的社区惯例与项目现有风格执行。

## 查询优先

需要新增组件、工具函数、请求器、组合式函数或第三方 API 前，优先运行：

```bash
node ~/.agents/skills/coder/scripts/query.js --root <项目根目录> <组件名或函数名>
```

常用选项：

```bash
node ~/.agents/skills/coder/scripts/query.js --root <项目根目录> --kind component BaseButton
node ~/.agents/skills/coder/scripts/query.js --root <项目根目录> --kind function formatDate --json
node ~/.agents/skills/coder/scripts/query.js --root <项目根目录> --refresh
```

脚本首次运行或使用 `--refresh` 时建立项目索引；普通查询只读取索引，不读取 `.docs` 或全部源码。索引不包含源码正文和敏感配置，可提交也可加入项目 `.gitignore`。源码发生变化后，在下一次开发前用 `--refresh` 更新。

**索引容量与 SQLite 模式**：索引条目 ≤300 时使用单个 JSON 文件；超过 300 条时自动切换为 SQLite（`.coder/index.sqlite`，逐行读取，避免大 JSON 加载慢）。也可用 `--db` 强制启用、`--no-db` 强制禁用。SQLite 模式需要 Node ≥ 22.5（内置 `node:sqlite`；本机可用 `/Users/reynold/.vite-plus/bin/node`）。两种模式输出格式完全一致，查询时无需关心后端。

查询结果未命中时，才针对相关目录做小范围源码检查。禁止因为未命中就全量读取项目。

## 开发工作流

1. 确认任务涉及的文件后缀和项目根目录。
2. 查询相关组件、函数、依赖和组合式函数；记录可复用结果。
3. 相似度检查：需要新建的组件/函数若与已有实现相似度 ≥80%（功能、入参、交互、场景 4 项中 3 项一致），先与用户确认是"调整已有"还是"新建"，禁止直接绕过已有实现另起炉灶。
4. 实现最小改动。项目已有组件优先复用；新函数优先加入职责相同的已有文件。
5. `.vue` 文件保持 SFC 七区顺序（import → 类型 → 常量 → hooks → 状态/computed → 函数 → watch/onMounted），细节与反例见 `references/sfc-structure.md`；`.ts` 文件使用明确类型、窄化输入和可测试的纯函数边界。
6. **类型规范（硬性）**：业务代码禁止 `as` 断言与 `any`（唯一例外：无类型定义的老 npm 库，断言处加注释说明，并优先补 `.d.ts`）；类型在定义处声明，API 函数出入参都有类型。详细规则见 `references/sfc-structure.md` 第 6 节。
7. **目录规范（Vue 项目）**：页面专属组件放视图目录 `src/pages|views/<页面>/components/`；被 2+ 页面复用才提升 `src/components/business/`；二次封装的 UI 基础组件放 `src/components/base/`；`src/components/ui/` 只允许 shadcn CLI 生成，手写组件一律不进。业务代码禁止裸用原生交互元素（button/input/select 等）——优先 UI 库/已封装组件，没有就封装后再用；纯布局元素（div/section 等）不受限。UI 库组件第一次使用时即按设计稿封装。
8. **Hook 抽取时机**：禁止第一时间创建 `useXxx`。逻辑先写在组件函数区；只有"已被 2+ 组件实际复用"且"与响应式状态耦合"（纯逻辑去 utils）才抽取。
9. **错误处理（硬性）**：业务代码禁止 try/catch——API 错误由请求器拦截器统一处理；唯一例外是自己写的工具函数转换错误后**必须重抛**（禁止吞错）；`finally` 复位 loading 允许。判断标准与四种优雅用法见 `references/error-handling.md`。
10. **文件规模限制（硬性）**：`.vue` ≤ 500 行、`<script setup>` ≤ 300 行、其他语言单文件 ≤ 500 行。超过时按优先级拆分：① 独立区块拆子组件/子模块 → ② 与状态无关的纯逻辑抽 utils → ③ 最后才考虑 composable，顺序不可颠倒。拆分必须做，不可以用"以后再拆"跳过；确实拆不动（如第三方生成代码）时向用户说明。验收用 `query.js --check` 确认无超限文件。
11. **可访问性基础**：每个表单控件有可访问名称（label 或 aria-label）；纯图标按钮必须有 aria-label；列表/内容为空时渲染可见空态文案。
12. 运行项目已有的类型检查、测试和构建命令；至少验证受影响文件相关路径。构建通过 ≠ 交互正确，条件允许时起 dev server 实测关键交互。
13. 源码变更后按需执行 `query.js --refresh` 更新索引。项目已有 `.docs` 时可遵守其既有任务日志约定，但本技能不强制创建或维护 `.docs` 全量清单。

## 完成前检查

任务结束前运行（无超限文件即通过）：

```bash
node ~/.agents/skills/coder/scripts/query.js --root <项目根目录> --check
```

输出超过规模限制的文件清单及行数；`.vue` 同时给出 script 区行数。有超限时先拆分再收工。

## 子技能路由

- 新建项目、脚手架和基础依赖选型：`$skill: vue3-project-init`
- Vue 页面、组件和功能实现：`$skill: vue3-dev`
- 依赖清理、工具链和未使用代码分析：`$skill: vue3-deps`
- Vue 测试：`$skill: vue-testing-best-practices`
- Pinia：`$skill: vue-pinia-best-practices`
- Router：`$skill: vue-router-best-practices`
- shadcn-vue 项目：`$skill: shadcn-vue`（critical rules 为强制约束：条件类用 `cn()`、v-model 优先、间距用 flex gap、图标按钮带 aria-label）
- 默认工具链：`$skill: rattail`（工具函数优先用 rattail，不重复引 lodash；请求器 createAxle）

只在任务确实需要时加载子技能，避免重复加载规则。

## 共享资源

- `scripts/query.js`：栈检测（--init）、增量索引（JSON/SQLite 自动切换）、按名称查询、规模检查（--check）
- `.coder/profile.json`：项目栈档案（--init 生成，首次引导的依据）
- `references/sfc-structure.md`：Vue SFC 结构规范
- `references/error-handling.md`：错误处理规范
- `references/doc-formats.md`：旧 `.docs` 结构的兼容参考，仅在维护已有项目文档时使用
