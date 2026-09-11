# TypeScript 规范

适用：`.ts` / `.tsx` 以及 Vue SFC 内的 `<script lang="ts">`。先读 `principles.md`。

## 类型（硬性）

- 业务代码**禁止** `as` 断言与 `any`。用 `unknown` + 类型守卫窄化。
- 唯一例外：无类型定义的老 npm 库；断言处加注释，并优先补 `.d.ts` 后删断言。

```ts
// ✅
interface LoginParams { username: string; password: string }
interface LoginResult { token: string; userId: number }

export function login(data: LoginParams) {
  return request<LoginResult>({ url: '/auth/login', method: 'post', data })
}

// ❌
export function login(data) { return request({ url: '/auth/login', data }) }
const res = await login(form) as any
```

### 常见违规对照

| 违规 | 正确 |
| --- | --- |
| `ref(null) as Ref<FormData>` | `ref<FormData \| null>(null)` + 守卫 / `?.` |
| `useRoute().query.id as string` | `String(useRoute().query.id ?? '')` |
| `(e) => handle(e as MouseEvent)` | `(e: MouseEvent) => handle(e)` |
| `props as unknown as MyType` | 修正 `defineProps` 泛型 |
| `store.user as User` | Store 定义处标注类型 |
| `import('@/types').Xxx` 后断言 | `import type { Xxx }` |

## 声明位置

- 类型在**定义处**声明：变量、API 出入参、事件处理参数。
- 当前文件私有的 `interface`/`type` 放文件内（Vue 按 SFC 区序）；多文件复用的放 `src/types/`。
- API 层必须有明确的 Params / Result 类型，禁止裸 `any` 入参出参。

## 命名

- 类型/接口：`PascalCase`。
- 函数：动词开头（`handleSubmit`、`fetchList`、`formatDate`）。
- 常量：文件内 `UPPER_SNAKE_CASE`；导出的配置对象按项目既有风格。
- 禁止 `data1`、`isOk`、`tmp` 等无语义名进入交付代码（临时调试除外）。

## 文件规模（硬性）

- 受支持代码文件（`.ts`/`.tsx`/`.js`/`.jsx`）≤ **500** 物理行（空行与注释计入）。
- 新增或本任务修改的超限文件不得交付；本任务未涉及的遗留超限可记录，不扩大改动范围。
- 验收：`query.js --check`。

## 工具函数

- 先查 rattail（见 `rattail.md`）与项目已有导出；没有再写。
- 纯逻辑放 `utils`/`lib`，不写成 `useXxx`（composable 仅状态耦合且 2+ 消费者）。
- 新逻辑优先加入职责相同的已有文件，而不是新建小文件。

## 禁止额外编程（提醒）

- 不为「以后要支持多语言错误码/多主题/多租户」预留类型与参数。
- 不把单处使用的类型抽成「通用」泛型工厂。
