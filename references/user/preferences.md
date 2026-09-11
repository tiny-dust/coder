# 用户习惯索引

按主题登记 active/archived 条目。没有习惯时保持只有表头。

| id | 主题文件 | 标题 | 状态 |
| --- | --- | --- | --- |
| ts-001 | typescript.md | 导出函数用 function 声明 | active |
| ts-002 | typescript.md | API 文件后缀 .api.ts | active |
| vue-001 | vue3.md | 页面组件带 Page 前缀 | active |
| vue-002 | vue3.md | Pinia store 用 setup 风格单文件 | active |

## 用法

- 新增条目：在 `user/<topic>.md` 写完整条目，再在上表加一行。
- 归档：状态改为 `archived`，不删历史。
- 主题文件不存在时先创建，勿把无关主题塞进同一文件。
