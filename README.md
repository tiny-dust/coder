# Coder

[![skills.sh](https://skills.sh/b/tiny-dust/coder)](https://skills.sh/tiny-dust/coder)

所有开发任务的第一入口技能：只要涉及编写、修改、审查、调试或重构代码（不限语言），都先加载 **coder**。

它做三件事：

1. **约束写法** —— 四条一级铁律 + 按主题拆分的规范（Vue3 / TypeScript 深度内置，其他语言走通用工作流）。
2. **先查再写** —— 本地索引按组件名 / 函数名 / 导出名定位已有实现，减少重复造轮子和全库乱读。
3. **越用越像你** —— 规范分 `baseline`（官方默认）与 `user`（个人习惯）两层；习惯通过纠偏、收工汇总、仓库归纳三种方式沉淀，user 覆盖同主题 baseline。

---

## 目录

- [安装](#安装)
- [核心铁律](#核心铁律)
- [分层结构](#分层结构)
- [主题路由表](#主题路由表)
- [首次使用引导](#首次使用引导)
- [开发工作流](#开发工作流)
- [CLI 完整参考](#cli-完整参考)
- [Vue3 / TypeScript 深度规范](#vue3--typescript-深度规范)
- [习惯积累机制](#习惯积累机制)
- [仓库归纳（Induce）](#仓库归纳induce)
- [在真实 Vue3 项目中的验证](#在真实-vue3-项目中的验证)
- [设计取舍](#设计取舍)
- [FAQ](#faq)

---

## 安装

通过 [skills.sh](https://skills.sh) 生态安装（支持 Claude Code、Codex、Cursor、OpenCode 等 70+ agent）：

```bash
# 交互式安装（自动检测已装 agent）
npx skills add tiny-dust/coder

# 全局安装（所有项目可用）
npx skills add tiny-dust/coder -g

# 指定 agent 与免交互
npx skills add tiny-dust/coder -a claude-code -y

# 只看不装
npx skills add tiny-dust/coder --list
```

也可以直接克隆：

```bash
git clone https://github.com/tiny-dust/coder.git ~/.claude/skills/coder
# 或
git clone https://github.com/tiny-dust/coder.git ~/.agents/skills/coder
```

安装后在**新会话**中生效。脚本路径以技能实际安装目录为准（下文记作 `<SKILL_DIR>`，当前环境常见为 `~/.agents/skills/coder`），不要写死唯一绝对路径。

---

## 核心铁律

优先级最高，任何细节规则都不得违反。完整判定与反例见 [`references/baseline/principles.md`](references/baseline/principles.md)。

| # | 铁律 | 一句话判定 |
| --- | --- | --- |
| 1 | **禁止额外编程** | 删掉后当前需求仍能完成的抽象/配置/分支 → 不写 |
| 2 | **不要预想未来** | 不为「以后可能」预留；**2 个真实调用点**才抽共享层 |
| 3 | **代码整齐** | 分区顺序稳定、命名一致、同类逻辑同形 |
| 4 | **中低级可读** | 平铺直叙具名步骤；新人 3 分钟能顺着读完一条路径 |

发现逻辑 bug：先完成当前任务，再与用户确认是否修复，不擅自扩大范围。

---

## 分层结构

```text
coder/
├── SKILL.md                      # 调度层：铁律、工作流、路由、积累协议
├── scripts/query.js              # 索引 / 查询 / 栈检测 / 规模与枚举检查
├── references/
│   ├── baseline/                 # 官方默认规范（随技能版本走）
│   │   ├── principles.md         #   四条铁律口径与反例
│   │   ├── typescript.md         #   TS 类型、命名、API 出入参、文件规模
│   │   ├── vue3.md               #   目录 / hook / i18n / a11y / 初始化 / 依赖清理
│   │   ├── sfc-structure.md      #   SFC 七区与 computed 可读性
│   │   ├── enum.md               #   禁止 enum / as const，统一 rattail enumOf
│   │   ├── rattail.md            #   工具函数 rattail-first
│   │   ├── error-handling.md     #   禁止业务 try/catch
│   │   ├── readability.md        #   整齐与可读细则
│   │   └── tooling.md            #   查询优先、索引、--check
│   └── user/                     # 个人习惯层（随使用积累）
│       ├── README.md             #   协议、条目模板、覆盖规则
│       ├── preferences.md        #   习惯索引
│       └── <topic>.md            #   按主题的习惯正文（存在才读）
└── docs/compose/spec/            # 本技能自身的功能设计文档
```

**覆盖规则**：同一主题先读 `user/<topic>.md`，再读 `baseline/<topic>.md`；user 中 **active** 条目覆盖 baseline 冲突项。无 user 文件时只读 baseline。user 文件不存在则跳过，不预建空主题。

---

## 主题路由表

| 主题 | baseline | user（有则优先） |
| --- | --- | --- |
| 铁律口径 | `references/baseline/principles.md` | — |
| TypeScript | `references/baseline/typescript.md` | `references/user/typescript.md` |
| Vue3 项目结构 / hook / i18n / a11y | `references/baseline/vue3.md` | `references/user/vue3.md` |
| SFC 七区与 computed | `references/baseline/sfc-structure.md` | `references/user/sfc-structure.md` |
| 枚举 enumOf | `references/baseline/enum.md` | `references/user/enum.md` |
| rattail 工具链 | `references/baseline/rattail.md` | `references/user/rattail.md` |
| 错误处理 | `references/baseline/error-handling.md` | `references/user/error-handling.md` |
| 整齐与可读 | `references/baseline/readability.md` | `references/user/readability.md` |
| 查询 / 索引 / --check | `references/baseline/tooling.md` | `references/user/tooling.md` |
| 依赖版本审计 / 升级推荐 | `references/baseline/deps.md` | `references/user/deps.md` |

任务涉及哪些主题就加载哪些文件；同一任务混改 `.vue` 与 `.ts` 时叠加载规则，不拆成矛盾流程。

---

## 首次使用引导

第一次在某个项目中使用、且项目根目录**没有** `.coder/` 时，技能会三选一：

| 选项 | 做什么 | 适合 |
| --- | --- | --- |
| **1. 全量扫库** | `--init`（栈检测）+ `--refresh`（全量索引） | 长期在此项目开发 |
| **2. 只建当前需求相关** | 只 `--refresh`，不跑 `--init` | 小改动，不想为全项目建档 |
| **3. 本次不创建** | 跳过建库，小范围直接读源码 | 临时修一行 |

之后以 `.coder/` 是否存在为准，不再重复引导。栈检测会生成 `.coder/profile.json`（框架/版本、构建器、路由、UI 库、状态库、TypeScript、文件类型分布等）。

建议把 `.coder/` 加入项目 `.gitignore`；需要团队共享索引时也可以提交。

---

## 开发工作流

```text
确认项目根与 .coder 状态
        │
        ▼
  ① 查询（硬性）── query.js <名称>
        │ 未命中 → 小范围扫目录（禁止全库乱读）
        ▼
  ② 读目标源码 + 直接相关类型/调用方（索引摘要不能替代阅读）
        │
        ▼
  ③ 最小实现（铁律 1/2）── 按路由表加载 baseline/user 规则
        │
        ▼
  ④ 验证：项目 typecheck / test / build；必要时 dev 实测交互
        │
        ▼
  ⑤ --refresh（增删改文件后）→ --check（非零不得收工）
        │
        ▼
  ⑥ 习惯收工汇总（0–3 条候选，用户勾选才落盘）
```

硬性细则（类型、枚举、rattail、目录、hook 抽取、错误处理、文件规模、i18n、子组件逻辑随迁等）都在 baseline 对应文件，SKILL.md 不重复细节。

---

## CLI 完整参考

```bash
# 将 <SKILL_DIR> 换成本技能安装目录，<项目根> 换成目标项目
node <SKILL_DIR>/scripts/query.js --root <项目根> --init
node <SKILL_DIR>/scripts/query.js --root <项目根> --refresh
node <SKILL_DIR>/scripts/query.js --root <项目根> <组件名或函数名>
node <SKILL_DIR>/scripts/query.js --root <项目根> --kind component BaseButton
node <SKILL_DIR>/scripts/query.js --root <项目根> --kind function formatDate --json
node <SKILL_DIR>/scripts/query.js --root <项目根> --check
node <SKILL_DIR>/scripts/query.js --root <项目根> --check --json
node <SKILL_DIR>/scripts/query.js --root <项目根> --deps              # 列出声明依赖
node <SKILL_DIR>/scripts/query.js --root <项目根> --deps --latest     # 对比最新并分类 major/minor/patch
node <SKILL_DIR>/scripts/query.js --root <项目根> --db --refresh    # 强制 SQLite
node <SKILL_DIR>/scripts/query.js --root <项目根> --no-db --refresh # 强制 JSON
```

### 选项

| 选项 | 说明 |
| --- | --- |
| `--root <dir>` | 项目根目录（默认当前目录；会向上查找 `package.json`） |
| `--init` | 栈检测，写入 `.coder/profile.json` |
| `--refresh` | 增量重建索引（mtime + size 未变则复用） |
| `--check` | 文件规模 + enum/as-const 违规；有违规退出码 1 |
| `--deps` | 列出 package.json 依赖（支持 pnpm catalog） |
| `--latest` | 与 `--deps` 连用：调用包管理器 outdated，分类 major/minor/patch |
| `--json` | 机器可读输出 |
| `--kind component\|function\|all` | 过滤类型 |
| `--no-snippet` | 不打印源码片段 |
| `--lines <n>` | 片段行数（默认 30） |
| `--db` / `--no-db` | 强制 SQLite / JSON 后端 |
| `--help` | 帮助 |

### 查询结果包含什么

- 文件路径、总行数
- 导入来源及行号
- 导出符号起止行号
- Vue：`template` / `script setup`、props、emits、computed（名称 + 行号）
- 索引 hash（判断是否需 refresh）
- 默认附带最多 30 行源码片段（可用 `--lines` / `--no-snippet` 调整）

### 索引后端

| 条件 | 后端 |
| --- | --- |
| 条目 ≤ 300 | JSON（`.coder/index.json`） |
| 条目 > 300 | 自动 SQLite（`.coder/index.sqlite`，需 Node ≥ 22.5） |
| `--db` / `--no-db` | 强制指定（不持久化覆盖自动选择） |

索引只保存路径、导出名、SFC 接口摘要与哈希，**不含源码正文与敏感配置**。

### `--check` 检查什么

| 限制 | 阈值 |
| --- | --- |
| `.vue` 总行数 | ≤ 500 |
| `.vue` 全部 `<script>` 合计 | ≤ 300 |
| 其他受支持代码文件 | ≤ 500 |
| `enum` / `as const` 对象枚举 | 禁止（应使用 rattail `enumOf`） |

行数按物理行计（空行与注释计入；文件末尾换行不额外产生一行）。扫描已排除注释与字符串，不会误报文案中的 “enum”。

超限时默认拆分优先级：① 独立 UI 区块拆子组件 → ② 无状态纯逻辑抽 utils → ③ 最后才 composable（状态耦合且 2+ 消费者）。顺序是默认优先级，不是机械强制；拆分必须有当前需求依据。

### 依赖版本审计（`--deps`）

只在**你要求**升级/检查依赖时使用，不自动改版本。

```bash
# 1) 读声明版本（本地）
node <SKILL_DIR>/scripts/query.js --root <项目根> --deps

# 2) 对比最新（内部 npm/pnpm/yarn outdated --json）
node <SKILL_DIR>/scripts/query.js --root <项目根> --deps --latest
```

输出按 `major / minor / patch / none` 分类。推荐规则：

| 级别 | 默认建议 |
| --- | --- |
| patch | 可升 |
| minor | 可升；核心框架建议升级后跑验证 |
| major | **单独评估**：先读 CHANGELOG/Releases，再向用户说明风险 |

完整协议见 [`deps.md`](references/baseline/deps.md)。确认前禁止改 `package.json` / lockfile。

---

## Vue3 / TypeScript 深度规范

细节见 baseline 各文件，这里给速览。

### SFC 七区顺序（硬性）

```text
① import  →  ② 类型  →  ③ 常量  →  ④ hooks 调用
→  ⑤ ref/reactive/computed  →  ⑥ 函数  →  ⑦ watch/onMounted
```

禁止区域混排。import 按：第三方 → 项目 hook → 工具函数 → 组件 → 样式，组间空行。

### TypeScript（硬性）

- 业务代码禁止 `as` 断言与 `any`；用 `unknown` + 类型守卫。
- 唯一例外：无类型老 npm 库，断言处注释说明，并优先补 `.d.ts`。
- API 函数出入参都有类型；类型在定义处声明。

### 枚举（硬性）

```ts
// ❌ 禁止
enum Status { Idle, Done }
export const Status = { Idle: 0, Done: 1 } as const

// ✅ 统一 rattail
const Status = enumOf({ Idle: 0, Done: 1 })
type Status = EnumOf<typeof Status>
```

### 工具函数（硬性）

TS/Vue 需要工具函数时 **先查 rattail**（数组/对象/字符串/数学/DOM/防抖等）；请求器 `createAxle`，校验 `ruler-factory`。rattail 没有再写；不重复引 lodash。不确定时加载 `$skill: rattail`，不凭记忆猜 API。

### Vue3 目录与 hook

| 位置 | 放什么 |
| --- | --- |
| `src/pages\|views/<页面>/components/` | 页面专属组件 |
| `src/components/business/` | **2+ 页面**实际复用才提升 |
| `src/components/base/` | 二次封装的 UI 基础组件 |
| `src/components/ui/` | 仅 shadcn CLI 生成 |

- 业务禁止裸用原生交互元素（button/input/select）；优先 UI 库/已封装组件。
- **禁止第一时间创建 `useXxx`**：2+ 真实复用且状态耦合才抽；纯逻辑去 utils。
- **子组件提取时逻辑随迁**：只服务该区块的 ref/watch/DOM 查询必须随迁，父组件不留私有逻辑。

### 错误处理（硬性）

业务代码禁止 try/catch，异常交给请求器拦截器。允许：

1. 工具函数转换后**重抛**（禁止吞错）
2. 有真实恢复动作的重试/降级
3. `finally` 复位 loading

详见 [`error-handling.md`](references/baseline/error-handling.md)。

### vue-i18n（项目启用时硬性）

字典**只用 JSON 文件**（`src/locales/` 或 `i18n/locales/`），禁止写在 `.ts` 对象或 SFC `<i18n>` 块——否则 i18n Ally 等插件无法扫描与悬浮预览。

---

## 习惯积累机制

完整协议见 [`references/user/README.md`](references/user/README.md)。

### 三种触发

| 触发 | 时机 | 行为 |
| --- | --- | --- |
| **A. 纠偏即问** | 你明确纠正/否决/指定写法 | 立刻问是否记为长期习惯 |
| **B. 收工汇总** | 每次开发任务收工前 | 提 0–3 条候选，多选勾选 |
| **C. 仓库归纳** | 你要求归纳某仓库/过往项目 | 系统阅读后提炼，多选确认 |

**未勾选/未确认一律不落盘。** 与铁律冲突的不收录。

### 条目格式

```markdown
# 用户习惯：<主题>

### <id>: <一句话标题>
- 规则：具体可执行、可判定的约束
- 来源：YYYY-MM-DD 用户纠偏 | 收工确认 | 仓库归纳:<path>
- 适用：全局 | <语言/框架/工具>
- 状态：active | archived
```

示例：

```markdown
# 用户习惯：typescript

### ts-001: API 层禁止在调用方拆包
- 规则：api/*.ts 返回完整业务对象；组件内禁止再解构出未使用的字段
- 来源：2026-09-11 用户纠偏
- 适用：typescript
- 状态：active
```

```markdown
# 用户习惯：vue3

### vue-012: 列表页分页状态先写在组件内
- 规则：分页列表页统一「query + pagination 状态放组件，fetch 写在函数区」；不要预抽 usePagination
- 来源：2026-09-11 仓库归纳:~/projects/legacy-admin
- 适用：vue3
- 状态：active
```

新条目写入 topic 文件后，在 `preferences.md` 登记一行。单 topic ≤ 150 行，超限先归档旧条目。

---

## 仓库归纳（Induce）

对**过往项目**或**优秀参考仓库**做系统阅读，把可复用规范沉淀进 `user/` 层。目标可以是**本地路径**，也可以是**在线 GitHub 地址**。

### 支持的目标

| 类型 | 示例 |
| --- | --- |
| 本地路径 | `~/projects/legacy-admin` |
| GitHub 仓库 | `https://github.com/vuejs/core` |
| 指定分支/子目录 | `https://github.com/owner/repo@main` 或 `.../tree/main/packages/foo` |

### 流程

1. 确认目标与性质（自己的历史项目 → 偏好；外部优秀仓库 / GitHub → 参考）。
2. **在线地址**：浅克隆到临时目录，只读分析，用完删除（不改远端、不把克隆留在项目内）：

```bash
git clone --depth 1 [--branch <branch>] <github-url> /tmp/coder-induce-<repo>

# 可选：在克隆目录建索引，便于按组件/函数定位
node <SKILL_DIR>/scripts/query.js --root /tmp/coder-induce-<repo> --init
node <SKILL_DIR>/scripts/query.js --root /tmp/coder-induce-<repo> --refresh
```

3. **系统阅读**：目录结构 → 代表性模块（入口 / 组件 / 工具 / API / 测试）→ 抽样对照。  
   **禁止无目标全库乱读。**
4. 提炼候选条目（`来源` 写 `YYYY-MM-DD 仓库归纳:<本地路径或 GitHub URL>`）。
5. 用多选让你勾选；未勾选不写盘。
6. 与铁律冲突的不收录；只记「下次会重犯或重查」的内容。

归纳结果**只进 `user/`**，不直接改 `baseline/`（避免被任意仓库污染官方默认）。

### 触发说法示例

- 「用 coder 归纳一下这个仓库的规范」
- 「读一下 `~/projects/legacy-admin`，把它的编码习惯沉淀到 user 层」
- 「从 `https://github.com/vuejs/core` 提炼 Vue3 组件写法约定」
- 「学习这个 GitHub 仓库的 TS 工具函数组织方式：https://github.com/antfu/utils」

---

## 在真实 Vue3 项目中的验证

以下在本机真实项目 **`as_frontend`（air_space）** 上实测：

| 项 | 值 |
| --- | --- |
| 栈 | Vue 3.5.13 + TypeScript 5.6.2 + vue-router 4.5 + Pinia 2.2 + Naive UI + Vite 7.2 |
| 规模 | 346 个 `.vue`，272 个 `.ts`，索引 **645** 条文件 |
| Node | v24.21.0 |

### 1. 栈检测 `--init`

```text
Project: air_space
Frameworks: vue@3.5.13 (frontend)
Bundler: vite@7.2.0
Router: vue-router@4.5.0
UI: Naive UI
State: Pinia
TypeScript: yes @ 5.6.2
File types: .vue, .ts, .tsx, .js
```

生成 `.coder/profile.json`，可据此路由 Vue3/TS 规范。

### 2. 全量索引 `--refresh`

```text
Indexed 645 files (sqlite) in .../.coder/index.sqlite
```

645 > 300，**自动切到 SQLite**；耗时约 **0.4s**。增量 refresh（只 touch 一个文件）约 **0.3s**。

### 3. 查组件

```bash
node scripts/query.js --root <proj> --kind component UserAvatar --no-snippet
```

```text
## UserAvatar [component]
- File: src/components/common/a-user-avatar/UserAvatar.vue (70 lines)
- Imports: @/apis/types:13
- SFC: template=true, script setup=true, props=member, emits=none,
       computed=size_str@L34-36, avatar_size@L38-40
```

可在动手改组件前直接拿到 props / computed 行号，避免盲读。

### 4. 查函数 + 源码片段

```bash
node scripts/query.js --root <proj> formatDate --lines 12
```

命中 `src/utils/date.ts`，列出全部导出起止行号，并打印 `formatDate` 等片段——写新格式化函数前先确认是否已有实现。

### 5. 完成前检查 `--check`

对存量项目会如实报出问题（**退出码 1**），例如该次实测：

- 21 个文件超过规模限制（含生成代码 `src/apis/generated/_types.ts` 10390 行——属第三方/生成代码，需与用户确认豁免）
- 71 处 enum / as-const 违规（存量代码尚未迁移 enumOf）

说明：`--check` 的作用是**约束本任务新增/修改**的代码。对「本任务未涉及」的遗留超限/违规，可记录为遗留，不得借此扩大改动范围；生成代码需说明原因并与用户确认。

### 结论

| 能力 | 结果 |
| --- | --- |
| 栈检测（Vue3+TS 全家桶） | 通过 |
| 大项目自动 SQLite | 通过（645 条） |
| 组件 props/emits/computed 索引 | 通过 |
| 函数导出行号 + 片段 | 通过 |
| 增量 refresh | 通过 |
| --check 退出码与违规分类 | 通过（exit 1） |
| 铁律 / baseline 路由 / user 层 | 文档层，随会话加载生效 |

---

## 设计取舍

| 选择 | 原因 |
| --- | --- |
| CLI + 本地索引，非常驻服务 | 无后台进程、权限与跨平台安装负担；查询延迟与规模解耦 |
| JSON / SQLite 自动切换 | 小项目一次读入；大项目按行查询 |
| baseline / user 分层 | 官方默认可升级；个人习惯不被版本覆盖 |
| 习惯必须用户确认才写入 | 避免噪音、误记、自动污染 |
| 归纳只进 user | 任意仓库不能改写官方 baseline |
| 不强制 `.docs` 全量清单 | 降低仪式成本；索引已覆盖定位需求 |

---

## FAQ

**Q: 没有 `.coder/` 能开发吗？**  
能。首次引导选「本次不创建」后，小范围直接读源码；想启用时手动 `--init` / `--refresh`。

**Q: 索引会不会泄漏源码？**  
不会。索引只含路径、导出名、SFC 接口摘要、行数与 hash，不含源码正文。

**Q: Node 版本不够怎么办？**  
SQLite 模式需要 Node ≥ 22.5。不够时用 `--no-db` 强制 JSON，或升级 Node。

**Q: 存量项目很多 enum / 超长文件，`--check` 一直红？**  
只约束本任务新增/修改。遗留问题记录即可，不借此扩大范围；生成代码与用户确认豁免。

**Q: 如何开始积累自己的习惯？**  
正常使用即可。下次纠正 agent 写法时选「记为长期习惯」；或让 agent 归纳你的历史仓库。

**Q: 和 vue3-dev / rattail 的关系？**  
coder 是总入口；复杂 Vue 场景可再加载 `vue3-dev` 等子技能；TS 工具函数强制优先 rattail。

---

## 子技能路由

- 新建项目、脚手架和选型：`vue3-project-init`
- Vue 页面与功能：`vue3-dev`
- 依赖清理、工具链：`vue3-deps`
- Vue 测试 / Pinia / Router：对应 best-practices 技能
- shadcn-vue：`shadcn-vue`
- 默认工具链：`rattail`

只在任务确实需要时加载，避免重复注入规则。

---

## License

见 [LICENSE](LICENSE)。
