# try/catch 优雅使用方案

先读 `principles.md`。业务代码禁止 try/catch，异常向上抛给请求器拦截器统一处理。本文件详述**在框架内优雅使用 try/catch 的四种方式**——判断标准、四种用法、全局看板、Vue 特有细节、反模式清单。

## 目录

1. 核心心智模型
2. 判断标准
3. 四种优雅用法
4. 全局看板：错误在哪里被捕获
5. Vue 特有细节
6. 反模式清单

## 1. 核心心智模型

**try/catch 不是错误处理，是控制流**——`throw` 是"向上汇报"，`catch` 是"我有办法处理"。如果 catch 之后你没有做出任何**改变结果**的动作，那这个 catch 就是噪音。

## 2. 判断标准

> **catch 里能做什么有意义的事？做不了就别 catch。**

catch 里三个 "有意义" 的动作：

| 动作 | 说明 | 示例 |
| --- | --- | --- |
| **转换再抛** | 补充上下文/改成领域错误后重新 throw | `throw new ApiError(..., { cause: e })` |
| **有兜底才接** | 有实际的恢复/重试/降级分支 | 重试 N 次、返回 fallback |
| **绝不吞错** | 吞掉 = 静默失败，调用方永远不知道 | `catch {}`、`catch { return null }` |

## 3. 四种优雅用法

### 用法一：工具函数——转换错误形态后重抛（规则内唯一途径）

自己写的工具函数内部用 catch 的唯一目的：**给错误补充上下文**，让上层的拦截器/用户看得懂。

```ts
// ✅ 优雅：补充上下文后重抛（用 Error 的 cause 保留原始错误链，ES2022 原生）
export async function fetchUserProfile(id: string) {
  try {
    const res = await api.get(`/users/${id}`)
    return res.data
  } catch (e) {
    throw new ApiError(`获取用户 ${id} 的资料失败`, { cause: e })
  }
}

// ❌ 不优雅：catch 里什么都没做就重抛（等于没写，装饰性 try/catch）
export async function fetchUserProfile(id: string) {
  try {
    return (await api.get(`/users/${id}`)).data
  } catch (e) {
    throw e
  }
}

// ❌ 更糟：吞掉
export async function fetchUserProfile(id: string) {
  try { return (await api.get(`/users/${id}`)).data } catch { return null }
}
```

### 用法二：数据解析/防御性转换——窄化后再抛

解析外来数据（localStorage、JSON.parse、第三方回调）时，catch 用于**把"未知错误"变成"明确错误"**：

```ts
function parseConfig(raw: string): Config {
  try {
    const data = JSON.parse(raw)
    return validateConfig(data)  // 校验失败也会 throw
  } catch (e) {
    throw new ConfigError(`配置解析失败，请检查格式`, { cause: e })
  }
}
```

### 用法三：重试/降级——有实际恢复动作才 catch

业务里**唯一应该在高处 catch** 的场景——你有兜底方案。注意重试逻辑本身也应是工具函数（放 utils），不散在业务里：

```ts
// src/utils/retry.ts（工具函数）
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  isRetryable: (e: unknown) => boolean = () => true,
): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn()
    } catch (e) {
      if (i >= retries || !isRetryable(e)) throw e  // 放弃：重抛
      await delay(2 ** i * 200)  // 指数退避
    }
  }
}
```

```ts
// 业务代码不 catch，只用工具函数：
const data = await withRetry(() => api.get('/list'), 2, (e) => e instanceof NetworkError)
```

### 用法四：finally——资源收尾（不算错误处理）

**`finally` 永远优雅**——它不捕获、不吞错，只保证收尾：

```ts
loading.value = true
try {
  await save(form)
} finally {
  loading.value = false  // 无论成败都复位，错误自然上抛给拦截器
}
```

`try/finally`（无 catch）是业务代码中最常见的优雅形态。

## 4. 全局看板：错误在哪里被捕获

```
throw 抛出的地方          catch 应该出现的地方
────────────────────────────────────────────────
工具函数内部  ──转换信息─→  工具函数自己（必须重抛）
API 调用层    ──────────→  ❌ 业务代码不 catch
                         →  ✅ 请求器拦截器（统一提示/401/跳转）
事件/异步     ──────────→  ✅ app.config.errorHandler（兜底日志）
组件渲染错误  ──────────→  ✅ onErrorCaptured / ErrorBoundary
```

被拦截器接住的错误，**永远不该出现在业务代码的 catch 里**。

## 5. Vue 特有细节

1. **unhandledrejection**：`onMounted(async () => { await load() })` 的 rejected promise 会变成浏览器控制台红字（不打断用户）。因此**工具函数/请求器层必须保证错误不会逃逸到 unhandledrejection**——请求器拦截器就是天然兜底，只要它存在，业务代码里所有 `await` 的异常都会被接住。
2. **全局兜底**：`app.config.errorHandler` 可接住组件渲染/生命周期里同步抛出的错误并打日志；`onErrorCaptured` 在组件边界接住子树错误（等价 React ErrorBoundary）。
3. **不要在渲染期（模板/computed）里做 try/catch**——渲染函数里抛错会直接崩组件；把易错计算放进工具函数，用「转换再抛」让错误在调用点暴露。

## 6. 反模式清单

| 反模式 | 为什么 | 改法 |
| --- | --- | --- |
| `catch { return null }` 吞掉解析失败 | 调用方不知道失败，后续空值到处兜 | `throw new XxxError('...', { cause: e })` |
| catch 里 `ElMessage.error` | 与请求器拦截器重复弹窗 | 删掉 catch，错误交给拦截器 |
| `catch (e) { throw e }` | 装饰性，无任何转换 | 直接删掉 try/catch |
| `catch` 但返回值类型不变（`Promise<T> → T \| undefined`） | 隐含吞错 | 重抛或明确 fallback |
| 事件处理器里 try/catch 包整个 `onMounted` | 错误被吞，页面看似正常实则没加载 | 让拦截器/errorHandler 处理，或重抛 |
| `try { await fn() } catch { /* 空 */ }` | 静默失败 | 删掉，或加注释说明"故意忽略"且不吞关键错误 |

## 一句话总结

> **catch 只在三种情况出现：转换再抛（工具函数）、有兜底才接（重试/降级）、绝不吞错。其他时候用 `finally` 收尾，让异常自由地向上飘到拦截器。**

## 7. 与业务 service 封装的关系

在使用 `callService` 的项目中，service 封装属于「公共工具层」而非普通业务代码。它的职责之一是**拦截最通用的业务失败并通知用户**，同时保持异常继续向上抛出以不破坏调用方控制流。

实践规则：

1. **带 `success` / `code` 等显式失败字段的 service 响应**：封装层应在检测到失败时先用 `toast.error(后端 message || 业务兜底文案)` 通知用户，再 `throw`，避免调用方静默失败。
2. **无显式失败字段、轮询中间态、或仅读取状态快照的响应**：封装层不自动 toast，仍然按原有业务语义返回或抛错，由调用方决定提示方式。
3. **调用方已有 catch + toast**：短期可允许重复提示，作为安全兜底；中期应在调用方删除重复 toast，或改为区分「已被封装层提示过的错误」。