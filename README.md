# Coder

[![skills.sh](https://skills.sh/b/tiny-dust/coder)](https://skills.sh/tiny-dust/coder)

所有开发任务的第一入口技能：只要涉及编写、修改、审查、调试或重构代码（不限语言），都先加载 coder。当前深度规范内置 Vue 3 与 TypeScript（SFC 结构、类型优先、复用优先），通过本地 Node.js 索引按需查询已有组件和工具函数，减少重复读取项目文档和无关源码；其他语言复用同一套通用工作流，并通过范式积累机制随开发经验沉淀新语言/框架的最佳实践（references/<language>.md），让技能越用越全面。

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

也可以直接克隆或引用单个文件：

```bash
git clone https://github.com/tiny-dust/coder.git ~/.claude/skills/coder
```

## 核心铁律

**禁止过度设计与过度开发，永远用最简洁的方式实现当前需求。** 不做需求外的抽象与配置项，不为未来可能写代码。发现逻辑 bug 时先完成当前开发，再与用户确认是否修复。

## 首次使用引导

第一次在项目中使用时（项目无 `.coder/` 目录），技能会先询问建库范围，三选一：

1. **全量扫库**：`--init`（栈检测生成范式档案）+ `--refresh`（全量索引）。之后所有任务查询最快最准，适合长期开发。
2. **只建当前需求相关记录**：只跑 `--refresh` 建索引，不生成范式档案；本次只深入需求相关文件。适合小改动，档案以后可随时补跑 `--init`。
3. **本次不创建**：跳过建库直接开发（小范围阅读相关源码），之后不再询问。

栈检测自动识别框架与版本（Vue/React/Svelte）、构建器、路由、UI 库、状态库、TypeScript 版本、文件类型分布与工具链，生成 `.coder/profile.json`。

## 能力

- `.vue`：Vue 3 SFC 结构、组件接口和复用规则
- `.ts`：类型优先、工具函数复用和可测试边界
- `.vue` 与 `.ts` 混合任务：共享同一套开发工作流
- 按组件名、函数名、导出名或路径查询项目源码索引
- 项目栈自动检测与范式档案（`--init`）
- 大项目 SQLite 索引（>300 条自动切换，查询成本与项目规模解耦）
- 不要求项目维护全量 `.docs` 清单

## 查询命令

```bash
node scripts/query.js --root /path/to/project --init      # 栈检测，生成 .coder/profile.json
node scripts/query.js --root /path/to/project --refresh
node scripts/query.js --root /path/to/project --kind component BaseButton
node scripts/query.js --root /path/to/project --kind function formatDate --json
node scripts/query.js --root /path/to/project --db --refresh   # 强制 SQLite 索引
```

索引写入目标项目的 `.coder/`（`index.json` 或 `index.sqlite`，由条目数自动决定，>300 条切换 SQLite；SQLite 需要 Node ≥ 22.5）。索引只保存文件路径、导出名、SFC 接口摘要和哈希，不保存源码正文。建议在目标项目的 `.gitignore` 中加入 `.coder/`；需要团队共享索引时也可以提交它。

## 设计取舍

当前实现采用 CLI + 本地索引，而不是常驻服务或开机启动。首次 `--refresh` 全量扫描，之后的 `--refresh` 按 mtime + size 增量更新，只重读变更文件；普通查询只读索引。小项目走 JSON（一次读入），大项目走 SQLite（按行查询），查询延迟与项目规模解耦。没有后台进程、权限和跨平台安装负担，同时避免每次任务全量读取 `components.md` / `utils.md`。

## 目录

- `SKILL.md`：调度规则
- `scripts/query.js`：索引与查询 CLI
- `references/sfc-structure.md`：Vue SFC 规范
- `references/error-handling.md`：错误处理规范
- `references/doc-formats.md`：已有项目 `.docs` 的兼容参考
