---
feature: habit-accumulating-coder
status: delivered
updated: 2026-09-11
branch: main
commits: d4cb02f..<working-tree-uncommitted> # 本轮改动在 main 工作树，未提交
---

# Habit-Accumulating Coder

## Report

**What was built** — 将 coder 从「规则堆在 SKILL.md」重构为 baseline/user 分层：四条一级铁律（禁止额外编程、不要预想未来、代码整齐、中低级可读）升为调度层核心并写入 `principles.md`；Vue/TS/enum/rattail/error-handling/readability/tooling 等硬规则按主题下沉到 `references/baseline/`；新增 `references/user/` 习惯层（纠偏即问、收工汇总、仓库归纳 Induce 三种来源，user 覆盖同主题 baseline）。SKILL.md 缩为 125 行调度+路由+协议。

**Verification** — 路由文件全存在；旧根级 references 已迁移删除；铁律/规则15/Induce 均可 grep 到；`node scripts/query.js --help` 可用；独立 Review 三轴 PASS、无 critical。

**Journey log** — 用户明确选择在 main 工作树直接改（跳过 worktree）；归纳结果只进 user/ 避免污染官方 baseline；query.js 本轮零功能改动（禁止额外编程）。
## [S1] Problem

当前 `coder` 技能已具备「范式积累机制」雏形，但存在四处结构性问题：

1. **积累机制过薄**：仅有 5 条原则描述，没有用户习惯的存放格式、优先级覆盖关系、触发时机协议。无法真正「根据用户使用慢慢积累编程习惯」。
2. **规则未按主题拆分**：Vue/TS/enum/rattail/i18n/目录/错误处理几乎全堆在 `SKILL.md`（18 条硬规则挤在一起），与目标「每个语言 / 框架 / 工具库单独 md」不符，中低级开发者难以定位。
3. **个人编程哲学未升为一级约束**：用户核心口径是「禁止额外编程、不要预想未来、代码整齐、适合中低级开发阅读」。现有铁律只覆盖过度设计，整齐度与可读性散落在 SFC 规范里，未被统一表述。
4. **路径与路由脆弱**：`query.js` 硬编码 `~/.agents/skills/coder`；references 挂在根下，没有 baseline / user 分层，后续用户习惯无处安放，也容易被「官方最佳实践」覆盖。

## [S2] Design

### 分层模型

```
references/
  baseline/          # 官方/默认最佳实践（随技能版本走）
    principles.md    #   四条一级铁律的统一口径与反例
    typescript.md    #   TS 类型、命名、API 出入参、文件规模
    vue3.md          #   Vue3 目录/hook/i18n/a11y/初始化/依赖清理
    sfc-structure.md #   SFC 七区与 computed 可读性（自旧路径迁入）
    enum.md          #   禁止 enum / as const，统一 rattail enumOf
    rattail.md       #   工具函数 rattail-first
    error-handling.md#   禁止业务 try/catch（自旧路径迁入）
    readability.md   #   代码整齐 / 中低级可读
    tooling.md       #   查询优先、索引、--check、refresh
  user/              # 用户积累的个人习惯（可被用户长期维护）
    README.md        #   积累协议、条目模板、覆盖规则
    preferences.md   #   习惯索引（主题 → 条目）
    <topic>.md       #   按主题的习惯正文（存在才读）
```

覆盖规则：**同一主题先读 `user/<topic>.md`，再读 `baseline/<topic>.md`；user 中 active 条目覆盖 baseline 冲突项。** 无 user 文件时只读 baseline。

### SKILL.md 重写目标

- 只保留：适用范围、四条铁律、首次引导、开发工作流、主题路由表、习惯积累协议、完成前检查、子技能路由、共享资源。
- 18 条硬规则全部下沉到 baseline 对应文件；SKILL.md 用路由表指向，不重复细节。
- 脚本调用统一写成 `<本技能目录>/scripts/query.js`，并在文首说明当前安装路径示例。

### 四条一级铁律（贯穿 baseline）

1. **禁止额外编程** —— 只写当前需求可观察行为所需代码；删掉后需求仍成立的抽象/配置/分支一律不写。
2. **不要预想未来** —— 不为「以后可能」预留接口、策略、配置项；已有 2 个真实调用点才抽取共享层。
3. **代码整齐** —— 文件内分区顺序稳定、命名一致、同类逻辑同形；禁止区域混排与风格漂移。
4. **中低级可读** —— 优先平铺直叙的具名步骤，拒绝炫技链式、过深嵌套、隐式魔法；新人 3 分钟能顺着读完一条路径。

### 习惯积累协议

**触发 A —— 纠偏即问**：用户明确纠正写法、否决推荐、或指定风格时，立刻用 `question` 问是否记为长期习惯；用户同意则写入 `references/user/<topic>.md` 并登记 `preferences.md`。

**触发 B —— 收工汇总**：每次开发任务收工前，回顾本次 0–3 条可沉淀候选（被用户改过 2 次以上的模式、或用户口头确认的约定），用 `question` 多选让用户勾选；无候选则跳过，不打扰。

**触发 C —— 仓库归纳**：见下节 Induce；对过往项目/优秀仓库系统阅读后，候选同样须用户勾选才落盘。

**条目格式**（每条一个三级标题）：

```markdown
### <id>: <一句话标题>
- 规则：具体可执行约束
- 来源：YYYY-MM-DD 用户纠偏 | 收工确认 | 仓库归纳:<path>
- 适用：全局 | <语言/框架/工具>
- 状态：active | archived
```

**纪律**：新习惯必须可执行、可判定；与四条铁律冲突的不收录；单 topic 文件 ≤ 150 行，超限先归档再写。

### query.js

本轮不改功能。仅在文档中消除硬编码路径表述；脚本本身保持兼容。

### 仓库归纳模式（Induce）

除任务中的纠偏/收工汇总外，支持对**过往项目**或**优秀参考仓库**做系统阅读，归纳出可复用规范并沉淀进 `user/` 层。

触发：用户明确要求「归纳/总结/学习这个仓库的规范」，或指定路径让技能提炼编码习惯。

流程（SKILL.md 固定为协议，不写死扫描算法）：

1. 确认目标路径与性质（自己的历史项目 → 偏好来源；外部优秀仓库 → 参考来源）。
2. 系统阅读：目录结构 → 代表性模块（入口/组件/工具/API/测试）→ 抽样对照，禁止无目标全库乱读。
3. 提炼成候选习惯条目（沿用 user 条目模板，`来源` 写 `YYYY-MM-DD 仓库归纳:<path>`）。
4. 用 `question` 多选让用户勾选后写入 `references/user/<topic>.md`；未勾选不落盘。
5. 与四条铁律冲突的归纳结果不收录；只记「下次遇到同样场景会重犯或重查」的内容。

归纳结果**只进 `user/`**，不直接改写 `baseline/`（baseline 仍保持官方默认，避免被任意仓库污染）。query.js 本轮不新增 induce 子命令。

### 明确不做

- 不新建常驻服务、不自动写习惯（必须用户确认）。
- 不为「以后可能支持的语言」预写空 reference。
- 不删除已有的「子组件逻辑随迁」规则 15（未提交改动一并纳入）。
- 不改 query.js 索引/check 算法。

## [S3] Out of Scope

- 新语言（Python/Go 等）的 baseline 实现（只保留 user 层可扩展位）。
- rattail 技能本身的 API 变更。
- skills.sh 发布流程、CI、测试套件新增。
- 将技能安装到 `~/.config/mimocode/skills/`（本仓库仍是技能源）。

## Tasks

- [x] T1: 写 `references/baseline/principles.md`（四条铁律口径 + 反例）— acceptance: 文件存在且含 4 条各自判定标准与反例 (covers: S2)
- [x] T2: 迁移/拆分既有规则到 baseline 各主题文件 — acceptance: typescript/vue3/sfc-structure/enum/rattail/error-handling/readability/tooling 均存在；旧根级 `references/sfc-structure.md`、`error-handling.md` 删除或改为跳转；无规则丢失 (covers: S2; depends: T1)
- [x] T3: 建立 `references/user/` 协议与空模板（含纠偏/收工/仓库归纳三种来源）— acceptance: README 含协议与模板；preferences.md 可被直接追加；含 induce 来源示例 (covers: S2; depends: T1)
- [x] T4: 重写 SKILL.md 为调度层 + 路由表（含仓库归纳协议）— acceptance: 铁律=4条；工作流/路由/积累/归纳协议齐全；硬规则细节不在 SKILL.md 重复；脚本路径不写死为唯一用法 (covers: S2; depends: T2, T3)
- [x] T5: 更新 README.md 与 agents/openai.yaml 描述 — acceptance: 文档反映分层结构与积累机制 (covers: S2; depends: T4)
- [x] T6: 一致性自检 — acceptance: SKILL.md 路由表指向的文件全部存在；无死链；未提交的规则15保留在 vue3.md (covers: S2; depends: T4, T5)
