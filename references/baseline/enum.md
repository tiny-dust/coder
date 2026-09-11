# 枚举规范（硬性）

适用：TS / Vue 业务代码。先读 `principles.md`。

## 禁令

- **禁止** `enum` 声明（含 `const enum`）。
- **禁止**用 `as const` 对象模拟枚举。
- 统一使用 rattail 的 `enumOf`。

```ts
// ❌
enum Status { Idle, Done }
export const Status = { Idle: 0, Done: 1 } as const

// ✅
import { enumOf, type EnumOf } from 'rattail'

const Status = enumOf({ Idle: 0, Done: 1 })
type Status = EnumOf<typeof Status>

Status.label(Status.Idle)
Status.options()
```

需要新枚举时先加载 `$skill: rattail` 确认 API，不凭记忆猜。

## 验收

`query.js --check` 会扫描 `enum` 声明与 `as const` 对象枚举（已排除注释和字符串，不会误报文案中的 “enum”）。非零退出不得收工。

## 不收录

- 与铁律冲突的「为未来状态机预留的巨型枚举」——当前需求用不到的成员不写。
