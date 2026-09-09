# SFC 代码结构规范

## 目录

1. 结构顺序总览
2. 各区域规则
3. 标准示例
4. 反例
5. 文件规模限制与超限处理
6. 类型规范

## 1. 结构顺序总览

`<script setup lang="ts">` 内部代码必须按以下顺序自上而下书写：

| 顺序 | 区域 | 说明 |
| --- | --- | --- |
| 1 | import modules | 模块导入，按分类分组 |
| 2 | 类型定义 | 当前文件依赖的独立 interface/type 定义 |
| 3 | 常量定义 | 当前文件的常量/枚举/配置项 |
| 4 | hooks 调用 | 已有 composables（官方/第三方/项目内 useXxx）调用 |
| 5 | ref / reactive / computed | 响应式状态与计算属性声明 |
| 6 | 函数区 | 普通函数、事件处理函数、defineExpose 的函数 |
| 7 | watch / onMounted 区 | watch、watchEffect、生命周期钩子 |

## 2. 各区域规则

### 2.1 import 分组

自上而下按四组排列，组间空一行：

```ts
// ① 第三方库（node_modules）
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

// ② 项目内 hook / composable
import { useUserStore } from '@/stores/user'

// ③ 项目内工具函数
import { formatDate } from '@/utils/format'

// ④ 组件
import BaseButton from '@/components/base/BaseButton.vue'

// ⑤ 样式文件（如需要）
import './login.less'
```

### 2.2 类型定义

- 只放**当前文件使用**的 interface/type；可被其他文件复用的类型放到 `src/types/` 目录。
- 紧跟在 import 之后：

```ts
interface LoginForm {
  username: string
  password: string
}
```

### 2.3 常量定义

- 当前文件专用的常量放这里；可复用的放 `src/constants/`。
- 命名用 `UPPER_SNAKE_CASE`。

```ts
const MAX_PASSWORD_LENGTH = 20
const DEFAULT_FORM: LoginForm = { username: '', password: '' }
```

### 2.4 hooks 调用

- 只调用**已存在**的 composable：官方（vueuse 等）、项目内已有的 useXxx。
- **禁止**为了"看起来整洁"而在本区域即兴创建新的 useXxx（见抽取时机规则）。

```ts
const route = useRoute()          // vue-router hook
const { isDark } = useDark()      // @vueuse/core hook
const userStore = useUserStore()  // 项目内已存在的 hook
```

### 2.5 ref / reactive / computed

- `ref` 管原始值或需要整体替换的状态；`reactive` 管多个字段始终一起使用的对象。一个组件优先选一种主要状态写法，除非边界清楚。
- 只有**依赖响应式值且需要缓存派生结果**时使用 `computed`；静态转换或不依赖响应式状态的逻辑使用普通纯函数。
- computed 必须是纯函数：只读取依赖并返回结果；禁止在 computed 内请求、修改 ref/reactive、写 store、弹 toast 或产生其他副作用。
- computed 必须保持浅显易懂：默认只提取纯粹的响应式派生值，不承载请求、修改状态或复杂业务流程；复杂逻辑拆成语义明确的中间 computed 或普通纯函数。
- 一个 computed 只表达一个业务概念，必须使用语义名称（如 `completedTodos`、`canSubmit`、`hasPermission`），禁止 `data1`、`isOk` 等无意义名称。
- computed getter 超过约 10 行、包含 3 个以上独立判断，或依赖 4 个以上状态时，先拆成语义明确的中间 computed/纯函数；不要为了“统一”创建通用计算框架。
- `computed` 默认只使用只读 getter 写法，必须保持浅显易懂；**禁止为了少写一个 `ref` 或事件处理而使用 `computed({ get, set })`**。
- 只有第三方组件明确要求双向 `v-model` 适配、且无法用普通 `ref` + 事件处理清楚表达时，才允许 writable computed；必须在代码旁用一句注释说明外部约束。
- 模板中的多条件判断、嵌套三元、超过一行的派生逻辑，提取为命名 computed 或纯函数；不要把业务判断堆在模板里。

```ts
const completedTodos = computed(() => todos.value.filter((todo) => todo.done))
const canSubmit = computed(() => Boolean(form.username) && form.password.length >= 6)
const formatDate = (value: Date): string => value.toISOString() // 无响应式依赖，用普通函数
```


### 2.6 函数区

- 普通函数、模板事件处理函数、defineExpose 暴露的方法。
- 函数内不直接写复杂内联逻辑，超过 ~15 行的函数考虑拆分为多个具名函数。
- 命名：动词开头（`handleSubmit`、`fetchList`）。

### 2.7 watch / onMounted 区

- 所有 `watch` / `watchEffect` / `onMounted` / `onUnmounted` 统一放在 script 最后。
- 顺序：watch → watchEffect → onMounted → onBeforeUnmount → onUnmounted。
- 禁止把 onMounted 写在状态声明旁边（区域混乱）。

## 3. 标准示例

```vue
<script setup lang="ts">
// ── ① imports ──────────────────────────────
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { login } from '@/api/auth'
import { formatDate } from '@/utils/format'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

// ── ② 类型定义 ──────────────────────────────
interface LoginForm {
  username: string
  password: string
}

// ── ③ 常量定义 ──────────────────────────────
const MAX_PASSWORD_LENGTH = 20
const DEFAULT_FORM: LoginForm = { username: '', password: '' }

// ── ④ hooks 调用 ────────────────────────────
const route = useRoute()
const userStore = useUserStore()

// ── ⑤ ref / reactive / computed ─────────────
const loading = ref(false)
const form = reactive<LoginForm>({ ...DEFAULT_FORM })
const canSubmit = computed(
  () => !!form.username && form.password.length >= 6 && !loading.value,
)

// ── ⑥ 函数区 ────────────────────────────────
function validateForm(): boolean {
  if (!form.username) {
    ElMessage.warning('请输入用户名')
    return false
  }
  return true
}

async function handleSubmit() {
  if (!validateForm() || loading.value) return
  loading.value = true
  try {
    const token = await login({ ...form })
    userStore.setToken(token)
    route.push('/')
  } finally {
    loading.value = false
  }
}

// ── ⑦ watch / onMounted ─────────────────────
watch(
  () => form.password,
  (v) => {
    if (v.length > MAX_PASSWORD_LENGTH) form.password = v.slice(0, MAX_PASSWORD_LENGTH)
  },
)

onMounted(() => {
  console.log('login view mounted')
})
</script>

<template>
  <div class="login-view">
    <BaseInput v-model="form.username" placeholder="用户名" />
    <BaseInput v-model="form.password" type="password" placeholder="密码" />
    <BaseButton :disabled="!canSubmit" :loading="loading" @click="handleSubmit">
      登录
    </BaseButton>
  </div>
</template>
```

## 4. 反例

```vue
<script setup lang="ts">
// ❌ 反例：结构混乱
import BaseButton from '@/components/base/BaseButton.vue'

const handleSubmit = async () => {
  // ❌ 函数在状态之前
}

const loading = ref(false)  // ❌ 状态在函数之后

interface LoginForm {       // ❌ 类型定义插在中间
  username: string
}

import { ref } from 'vue'   // ❌ import 不连续

onMounted(() => {})         // ❌ onMounted 散落在中部

const form = reactive<LoginForm>({ username: '', password: '' })

import { login } from '@/api/auth'  // ❌ import 再次出现
</script>
```

## 5. 文件规模限制与超限处理

| 限制 | 阈值 |
| --- | --- |
| SFC 总行数 | ≤ 500 行 |
| `<script setup>` 部分 | ≤ 300 行 |

超限时按以下优先级处理：

1. **拆模板**：将 template 中重复/可独立的区块拆成子组件（放同目录或 components 子目录）。
2. **抽纯函数**：与组件状态无关的纯计算/转换逻辑抽到 `src/utils/` 下的普通 ts 函数（**不是** useXxx）。
3. **最后才抽 composable**：只有逻辑与组件状态耦合且确实多组件复用，才抽 useXxx（见抽取时机规则）。

处理顺序不可颠倒：先拆组件、再抽工具函数、最后才考虑 hook。

## 6. 类型规范

### 6.1 核心禁令

- **禁止 `as any` 与 `as Type` 类型断言**出现在业务代码中。
- **禁止 `any`** 出现在业务代码中（`unknown` + 类型守卫收窄替代）。
- 类型在**定义处**声明：变量声明时标注类型、API 函数定义出入参类型、事件处理器标注参数类型。

### 6.2 唯一例外

老 npm 库不支持 TS 或类型定义不全时允许 `as`，但必须加注释说明原因：

```ts
// 例外：xxx 库 v1.x 未提供 TS 类型定义（上游 issue #123），此处需断言
const result = legacyLib.call() as LegacyResult
```

发现例外后：优先尝试 `src/types/` 下补充 `.d.ts` 声明文件补全类型，补全后删除断言。

### 6.3 API 函数类型规范

```ts
// ✅ 正确：api/auth.ts — 出入参都有类型
interface LoginParams { username: string; password: string }
interface LoginResult { token: string; userId: number }

export function login(data: LoginParams) {
  return request<LoginResult>({ url: '/auth/login', method: 'post', data })
}

// ❌ 错误：data 无类型 + 调用方断言
export function login(data) { return request({ url: '/auth/login', data }) }
const res = await login(form) as any
```

### 6.4 常见违规场景

| 违规写法 | 正确写法 |
| --- | --- |
| `ref(null) as Ref<FormData>` 或 `ref<FormData \| null>(null)` 后使用时断言 | `const form = ref<FormData \| null>(null)`，使用时用类型守卫或 `form.value?.xxx` |
| `useRoute().query.id as string` | `const id = String(useRoute().query.id ?? '')` |
| 事件 `(e) => handle(e as MouseEvent)` | `(e: MouseEvent) => handle(e)` |
| `props as unknown as MyType` 链式断言 | 检查 props 定义是否类型错误，修正 defineProps 泛型 |
| store 返回值断言 `store.user as User` | 在 Store 定义处给 state 标注类型（setup 写法 `ref<User \| null>(null)`） |
| `import('@/types').Xxx` 后断言 | 直接 `import type { Xxx }` |
