# 用户习惯：typescript

### ts-001: 导出函数用 function 声明
- 规则：`src/` 下导出的具名函数一律 `export function foo()`，不用 `export const foo = () =>`（内部非导出辅助函数可用箭头）。
- 来源：2026-09-11 用户纠偏
- 适用：typescript
- 状态：active

### ts-002: API 文件后缀 .api.ts
- 规则：接口请求模块放在 `src/apis/`，文件名形如 `user.api.ts`、`project.api.ts`；禁止 `services/`、`api/` 混用。
- 来源：2026-09-11 用户纠偏
- 适用：typescript
- 状态：active
