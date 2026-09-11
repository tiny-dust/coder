---
name: coder
description: "一切开发任务的总入口——只要任务涉及编写、修改、审查、调试或重构代码（不限语言和文件类型），必须先加载本技能。开始处理代码前，先确认项目根目录与 .coder 状态——已有索引时运行 scripts/query.js 查询；无索引时按首次引导选择建库或跳过。四条一级铁律贯穿始终：禁止额外编程、不要预想未来、代码整齐、中低级可读。规范分层：references/baseline/ 为官方默认（按主题拆分 typescript/vue3/sfc/enum/rattail/error-handling/readability/tooling/deps），references/user/ 为随使用积累的个人习惯（user 覆盖 baseline 同主题冲突）。积累触发：用户纠偏即问、收工汇总候选、以及对过往项目/优秀仓库/GitHub 在线地址做系统归纳（Induce，浅克隆只读后删）。依赖审计：--deps 读 package.json，--deps --latest 对比 registry 并分类 major/minor/patch，经用户确认才升级。当前深度规范内置 Vue 3 与 TypeScript；其他语言走通用工作流并可沉淀到 user/<language>.md。TS/Vue 硬性：工具函数优先 rattail；禁止 enum 与 as const 枚举，统一 enumOf；vue-i18n 字典只用 JSON。首次在项目中使用时先询问建库范围（全量/仅相关/跳过）。索引超过 300 条自动 SQLite。Vue 复杂场景可分派 vue3-project-init、vue3-dev 或 vue3-deps。"
---

# Coder

脚本路径中的 `<SKILL_DIR>` 指本技能实际安装目录（当前环境常见为 `~/.agents/skills/coder`；以加载本技能时的真实路径为准，不要假定唯一路径）。

## 适用范围

**只要任务是开发——编写、修改、审查、调试、重构任何代码——都必须先加载本技能**，不限语言与文件类型。

- `.vue` / `.ts`：完整规则（见下方路由表）。
- 其他语言：通用工作流（铁律、查询优先、最小实现、验证）仍生效；**不要套用 Vue 特定规则**；可沉淀到 `references/user/<language>.md`。

## 铁律（优先级最高）

1. **禁止额外编程** —— 只写当前需求可观察行为所需代码；删掉后需求仍成立的抽象/配置/分支一律不写。
2. **不要预想未来** —— 不为「以后可能」预留接口、策略、配置；已有 2 个真实调用点才抽取共享层。
3. **代码整齐** —— 分区顺序稳定、命名一致、同类逻辑同形。
4. **中低级可读** —— 平铺直叙的具名步骤；新人 3 分钟能顺着读完一条路径。

判定标准与反例：`references/baseline/principles.md`。发现逻辑 bug 时先完成当前开发，再与用户确认是否修复，不擅自扩大范围。

## 规范分层与主题路由

| 主题 | baseline | user（有则先读并覆盖同主题） |
| --- | --- | --- |
| 铁律口径 | `references/baseline/principles.md` | — |
| TypeScript | `references/baseline/typescript.md` | `references/user/typescript.md` |
| Vue3 项目结构/hook/i18n/a11y | `references/baseline/vue3.md` | `references/user/vue3.md` |
| SFC 七区与 computed | `references/baseline/sfc-structure.md` | `references/user/sfc-structure.md` |
| 枚举 enumOf | `references/baseline/enum.md` | `references/user/enum.md` |
| rattail 工具链 | `references/baseline/rattail.md` | `references/user/rattail.md` |
| 错误处理 | `references/baseline/error-handling.md` | `references/user/error-handling.md` |
| ROS 集成 | — | `references/user/ros.md` |
| 数据持久化 | — | `references/user/data.md` |
| 整齐与可读 | `references/baseline/readability.md` | `references/user/readability.md` |
| 查询/索引/--check | `references/baseline/tooling.md` | `references/user/tooling.md` |
| 依赖版本审计/升级推荐 | `references/baseline/deps.md` | `references/user/deps.md` |
| 习惯索引 | — | `references/user/preferences.md` |

规则：任务涉及哪些主题就加载哪些文件；user 文件**不存在则跳过**，不预建。同一文件后缀混用时叠加载规则，不拆成矛盾流程。

## 首次使用引导（每个项目一次）

第一次在项目中使用且根目录无 `.coder/` 时，用 `question` 三选一：

1. **全量扫库**：`--init` + `--refresh`。适合长期开发。
2. **只建当前需求相关**：只 `--refresh`，不跑 `--init`；本次只深读需求相关文件。可随时补 `--init`。
3. **本次不创建**：跳过建库，小范围直接读源码；之后不再询问。

```bash
node <SKILL_DIR>/scripts/query.js --root <项目根目录> --init
node <SKILL_DIR>/scripts/query.js --root <项目根目录> --refresh
```

之后以 `.coder/` 是否存在为准，不再重复引导。

## 开发工作流

1. **查询（硬性）**：按涉及的组件/函数名运行 `query.js`；无索引且用户选跳过时豁免，改为小范围读源码。详见 `tooling.md`。
2. **读代码（硬性）**：读目标文件及直接相关类型/调用方，只读任务相关最小范围。
3. **最小实现**：每个新增文件/抽象/配置/状态/函数必须对应当前需求具体行为；删掉后需求仍成立 → 删。2 个真实调用点才抽共享层。
4. **相似度**：与已有实现在核心职责、输入输出、使用场景中 ≥2 项一致 → 默认扩展已有；职责确实不同才与用户确认新建。
5. 按主题路由加载 baseline/user 规则后实现最小改动。
6. `.vue` 遵守 SFC 七区；`.ts` 明确类型与可测试纯函数边界。
7. 硬性细则按路由表读文件，不在本节重复（类型/枚举/rattail/目录/hook/错误处理/规模/i18n/逻辑随迁）。
8. 运行项目类型检查、测试、构建；必要时 dev 实测。
9. 变更后 `--refresh`；收工前 `--check` 非零不得收工。
10. **收工前习惯汇总**：见「习惯积累」。
11. **依赖升级（仅用户要求时）**：`--deps` / `--deps --latest` 审计，major 先读变更；经用户确认才改版本。见 `deps.md`。

## 习惯积累（随使用成长）

覆盖关系与条目模板：`references/user/README.md`。索引：`references/user/preferences.md`。

### 触发 A —— 纠偏即问

用户明确纠正写法、否决推荐、或指定风格时，**立刻**用 `question` 问是否记为长期习惯；同意则写入 `references/user/<topic>.md` 并登记 `preferences.md`。

### 触发 B —— 收工汇总

每次开发任务收工前，回顾 0–3 条候选（被用户改过 ≥2 次的模式、用户口头确认的约定）。有则 `question` 多选；无则跳过，不打扰。

### 触发 C —— 仓库归纳（Induce）

用户要求归纳过往项目或优秀参考仓库时，目标可以是**本地路径**或**在线 GitHub 地址**：

1. 确认目标与性质（本地历史项目 → 偏好；外部优秀仓库/GitHub → 参考）。支持 `https://github.com/<owner>/<repo>`（可带 `@branch` 或 `/tree/<branch>/<path>`）。
2. **在线地址获取（只读）**：浅克隆到临时目录后阅读，用完即删，不改原仓库：

```bash
git clone --depth 1 [--branch <branch>] <github-url> /tmp/coder-induce-<repo>
# 可选：在克隆目录建索引辅助定位
node <SKILL_DIR>/scripts/query.js --root /tmp/coder-induce-<repo> --init
node <SKILL_DIR>/scripts/query.js --root /tmp/coder-induce-<repo> --refresh
```

3. 系统阅读：目录结构 → 代表性模块（入口/组件/工具/API/测试）→ 抽样对照；**禁止无目标全库乱读**。
4. 提炼候选条目（模板同上，`来源` 写 `YYYY-MM-DD 仓库归纳:<本地路径或 GitHub URL>`）。
5. `question` 多选确认后写入 user 层；未勾选不落盘。清理临时克隆目录。
6. 与铁律冲突的不收录；只记「下次会重犯或重查」的内容。

归纳结果**只进 user/**，不直接改 baseline。

### 沉淀纪律

- 可执行、可判定；单 topic ≤ 150 行，超限先归档。
- 不自动写入。
- 新增 reference 后在本文件路由表补一行。

## 完成前检查

```bash
node <SKILL_DIR>/scripts/query.js --root <项目根目录> --check
```

输出超限文件与 enum/as-const 违规；有超限/违规先处理再收工。

## 子技能路由

- 新建项目、脚手架和选型：`$skill: vue3-project-init`
- Vue 页面与功能：`$skill: vue3-dev`
- 依赖清理、工具链：`$skill: vue3-deps`
- Vue 测试 / Pinia / Router：对应 best-practices 技能
- shadcn-vue：`$skill: shadcn-vue`
- 默认工具链：`$skill: rattail`

只在任务确实需要时加载，避免重复注入规则。

## 共享资源

- `scripts/query.js`：栈检测（--init）、索引 v3、查询、--check、依赖列表（--deps/--latest）
- `.coder/profile.json`：项目栈档案
- `references/baseline/*`：官方默认规范（按主题）
- `references/user/*`：个人习惯与索引
