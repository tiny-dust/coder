# 依赖版本审计与升级推荐

先读 `principles.md`。本文件约定：何时审计依赖、如何对比最新版、如何向用户推荐升级。**不自动改 package.json、不自动安装。**

## 触发

用户明确要求时才做，例如：

- 「看看依赖能不能升级」
- 「检查有没有过期的包」
- 「评估一下 Vue / TypeScript 要不要升到最新」
- 「这个项目依赖落后多少」

不要在普通功能开发里顺手全量升级（禁止额外编程 / 不扩大范围）。

## 步骤

### 1. 读取声明版本（本地，无网络）

```bash
node <SKILL_DIR>/scripts/query.js --root <项目根> --deps
node <SKILL_DIR>/scripts/query.js --root <项目根> --deps --json
```

- 读取 `package.json` 的 `dependencies` / `devDependencies`。
- pnpm `catalog:` 会合并 `pnpm-workspace.yaml` 解析。
- 按 lockfile 识别包管理器：`pnpm-lock.yaml` → pnpm，`yarn.lock` → yarn，否则 npm。

### 2. 对比最新版（只读 registry）

```bash
node <SKILL_DIR>/scripts/query.js --root <项目根> --deps --latest
node <SKILL_DIR>/scripts/query.js --root <项目根> --deps --latest --json
```

内部调用包管理器 `outdated --json`，输出 `current / wanted / latest`，并分类：

| bump | 含义 |
| --- | --- |
| `patch` | 修订号变化 |
| `minor` | 次版本变化 |
| `major` | 主版本变化（可能 breaking） |
| `none` | 已是最新 |
| `unknown` | 版本串无法解析 |

失败时（无网络、私有源、包管理器报错）会给出 `outdatedError`，不要假装已比对。

### 3. 核对变更（升级推荐前，尤其是 major）

对建议关注的包（用户点名的、major 的、核心栈 vue/vite/typescript/pinia 等）：

1. 查 `CHANGELOG.md` / GitHub Releases（可用 web 工具或浅克隆只读）。
2. 记录：是否 breaking、是否需要迁移步骤、对等 peer 依赖是否变化。
3. patch/minor 若无异常说明，可默认「通常兼容」；major **必须**先看变更再推荐。

### 4. 推荐输出（必须经用户确认才改）

向用户报告，**不要直接改依赖**。推荐格式：

| 包 | 当前 | 最新 | 级别 | 建议 | 理由/风险 |
| --- | --- | --- | --- | --- | --- |
| vue | 3.5.13 | 3.5.21 | patch | 可升 | 无 breaking 记录 |
| vite | 5.4.10 | 6.0.0 | major | 暂缓/单独评估 | 需读迁移指南 |

建议档位：

- **可升**：patch，或 minor 且无 breaking 记录。
- **可升但需验证**：minor 涉及常用 API，或核心框架；升级后跑 typecheck/test/build。
- **单独评估**：major、需要迁移指南、或 peer 依赖冲突。
- **不建议**：与项目锁死版本、私有 fork、已知不兼容。

用户同意升级后再改 `package.json` / lockfile，并跑项目验证；不同意则只留报告。

## 纪律

- `--deps` / `--latest` 只读；禁止在未确认时写版本、跑 install 改 lockfile。
- 不要为了「保持最新」主动升级与当前需求无关的依赖。
- workspace：报告要标明包来自根还是 catalog；改动 catalog 前说明影响面。
- 私有 registry / 内网：`outdated` 失败时说明原因，可改用人工提供的版本表。
- 与铁律冲突的「顺便重构以适配新 major」不收录进当前任务，另开需求。

## 与栈检测的关系

`--init` 生成的 `.coder/profile.json` 只记录**当前**框架/构建器版本，用于路由规范；升级决策以 `--deps --latest` 与变更阅读为准。
