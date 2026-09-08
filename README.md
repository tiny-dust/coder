# Coder

面向 Vue 3 与 TypeScript 项目的开发调度技能。它根据编辑文件的后缀自动匹配规则，并通过本地 Node.js 索引按需查询已有组件和工具函数，减少重复读取项目文档和无关源码。

## 能力

- `.vue`：Vue 3 SFC 结构、组件接口和复用规则
- `.ts`：类型优先、工具函数复用和可测试边界
- `.vue` 与 `.ts` 混合任务：共享同一套开发工作流
- 按组件名、函数名、导出名或路径查询项目源码索引
- 不要求项目维护全量 `.docs` 清单

## 查询命令

```bash
node scripts/query.js --root /path/to/project --refresh
node scripts/query.js --root /path/to/project --kind component BaseButton
node scripts/query.js --root /path/to/project --kind function formatDate --json
```

索引写入目标项目的 `.coder/index.json`。它只保存文件路径、导出名、SFC 接口摘要和哈希，不保存源码正文。建议在目标项目的 `.gitignore` 中加入 `.coder/`；需要团队共享索引时也可以提交它。

## 设计取舍

当前实现采用 CLI + 本地索引，而不是常驻服务或开机启动。首次 `--refresh` 全量扫描，之后的 `--refresh` 按 mtime + size 增量更新，只重读变更文件；普通查询只读索引。没有后台进程、权限和跨平台安装负担，同时避免每次任务全量读取 `components.md` / `utils.md`。如果未来实测项目规模使 CLI 延迟成为瓶颈，可以在不改变查询输出契约的前提下增加长驻服务。

## 目录

- `SKILL.md`：调度规则
- `scripts/query.js`：索引与查询 CLI
- `references/sfc-structure.md`：Vue SFC 规范
- `references/error-handling.md`：错误处理规范
- `references/doc-formats.md`：已有项目 `.docs` 的兼容参考
