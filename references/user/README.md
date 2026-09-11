# 用户习惯层（user/）

本目录存放**你自己的编程习惯**，随使用慢慢积累。它覆盖同主题的 `references/baseline/` 规则；无条目时只看 baseline。

## 优先级

1. 四条铁律（`baseline/principles.md`）永远最高。
2. 同主题：`user/<topic>.md` 中 **active** 条目覆盖 `baseline/<topic>.md` 冲突项。
3. baseline 仍是官方默认；user 是个人偏离/强化。

## 三种来源

| 来源 | 何时 | 写入 |
| --- | --- | --- |
| 用户纠偏 | 开发中你明确纠正/否决/指定写法 | `question` 确认后立刻写 |
| 收工确认 | 任务收工前 0–3 条候选（重复 2 次以上的模式等） | `question` 多选后写 |
| 仓库归纳 | 对过往项目/优秀仓库做系统阅读提炼 | `question` 多选后写；`来源` 标注路径 |

未勾选/未确认的一律不落盘。

## 条目模板

每个 topic 一个文件（如 `typescript.md`、`vue3.md`、`naming.md`）。存在才读，不预建空主题。

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

## 索引

新条目写入 topic 文件后，在 `preferences.md` 登记一行（id、主题、标题、状态），便于扫一眼。

## 纪律

- 只记「下次会重犯或会重查」的内容；不记一次性调试过程。
- 与四条铁律冲突的不收录。
- 单 topic 文件 ≤ 150 行；超限先 `archived` 旧条目再写新条目。
- 不自动写入；必须用户确认。
- 归纳结果只进 user/，不直接改 baseline/。
