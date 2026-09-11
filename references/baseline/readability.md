# 代码整齐与中低级可读

先读 `principles.md` 第 3、4 条。本文件给可执行细则。

## 整齐

| 维度 | 要求 |
| --- | --- |
| 分区顺序 | 按语言规范（Vue 见 `sfc-structure.md`）；禁止区域混排 |
| 命名 | 同类函数同一动词习惯；禁同文件混用 `GetUser`/`fetch_list`/`handleOk` |
| 同形 | 同职责逻辑用同一控制流形态，不要一段 early return、一段深嵌套 |
| 缩进/引号/分号 | 跟项目 formatter；不手写对抗 lint 的风格 |
| 文件长度 | 见 `typescript.md` / `sfc-structure.md`；超限拆分而非拖长 |

## 可读

1. **具名步骤优先**：长表达式拆成有名字的中间变量/函数。
2. **嵌套有上限**：建议 ≤ 3 层；更深用 early return / 卫语句。
3. **链式有上限**：连续 `.map().filter().reduce()` 建议 ≤ 3 段；更长拆步。
4. **禁隐式魔法数/字符串**：用常量或枚举语义名。
5. **注释写「为什么」**，不写「做了什么」；不靠注释解释烂命名。
6. **模板可读**：多条件/超一行派生逻辑进 computed/函数，不堆在 template。

## 反例 → 正例

```ts
// ❌ 嵌套 + 魔法 + 长链
if (user) {
  if (user.roles) {
    if (user.roles.includes('admin') || user.level === 3) {
      const names = list.map((x) => x.meta).filter((m) => m && m.ok).map((m) => m.name!)
      ...
    }
  }
}

// ✅ 卫语句 + 常量 + 分步
if (!user?.roles) return
const isAdmin = user.roles.includes(ROLE_ADMIN) || user.level === PRIVILEGE_ADMIN
if (!isAdmin) return
const names = list
  .map((x) => x.meta)
  .filter((m): m is Meta => Boolean(m?.ok))
  .map((m) => m.name)
```

```vue
<!-- ❌ 模板堆判断 -->
<button :disabled="!form.username || form.password.length < 6 || loading || !agree" />

<!-- ✅ 语义 computed -->
<button :disabled="!canSubmit" />
```

## 验收方式

- 代码交付前用 `--check` 过规模/枚举；可读性靠自检「新人 3 分钟能否读完一条路径」。
- 构建通过 ≠ 可读；条件允许时对照设计稿/交互路径再读一遍关键组件。
