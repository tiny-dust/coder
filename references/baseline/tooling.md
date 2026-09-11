# 工具链：查询索引与完成前检查

先读 `principles.md`。脚本路径见 `SKILL.md`（不要写死唯一安装路径）。

## 查询优先（硬性）

确认项目根目录与 `.coder/` 状态后，**处理代码前必须先查询**：

- 写新组件/函数前 → 查同名/相似名，避免重复造轮子
- 修改已有符号前 → 查名称，拿行号、导入、片段
- 排查 bug 前 → 查相关符号定位

```bash
node <SKILL_DIR>/scripts/query.js --root <项目根目录> <名称>
node <SKILL_DIR>/scripts/query.js --root <项目根目录> --kind component BaseButton
node <SKILL_DIR>/scripts/query.js --root <项目根目录> --kind function formatDate --json
node <SKILL_DIR>/scripts/query.js --root <项目根目录> --refresh
```

未查询就写代码 = 流程违规。唯一豁免：索引不存在且用户选了「本次不创建」。

查询命中后必须读目标文件及直接相关类型/调用方；索引摘要不能替代源码阅读。未命中再小范围扫目录，禁止全量读项目。

## 索引

- 首次或 `--refresh` 建索引；普通查询只读索引。
- ≤300 条：JSON；超限自动 SQLite（`.coder/index.sqlite`，需 Node ≥ 22.5）。`--db` / `--no-db` 可强制。
- 索引不含源码正文与敏感配置；可提交或加入项目 `.gitignore`。
- 源码变更后：新增/删除/移动文件必须 `--refresh`；改内容建议 `--refresh`。

## 完成前检查（硬性）

```bash
node <SKILL_DIR>/scripts/query.js --root <项目根目录> --check
```

- 检查文件规模（`.vue` ≤500、script 合计 ≤300、其他 ≤500）与 enum/as-const 违规。
- 非零退出不得收工；第三方生成代码受约束时说明原因并与用户确认。

## 验证

- 运行项目已有的类型检查、测试、构建；至少覆盖受影响路径。
- 构建通过 ≠ 交互正确；条件允许起 dev server 实测关键交互。
- 项目已有 `.docs` 可遵守其任务日志约定；本技能不强制维护全量 `.docs`。

## 依赖清理验收

见 `vue3.md`「依赖清理」。清理后必须重跑 build/dev。
