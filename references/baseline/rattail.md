# rattail 工具链优先（硬性）

适用：TS / Vue 需要工具函数、请求、表单校验时。先读 `principles.md`。

## 规则

1. 任何工具函数需求（数组/对象/字符串/数学/DOM/文件/防抖节流等）→ **先查 rattail** 是否已提供，有则直接用。
2. rattail 没有等价能力 → 才允许项目内新写或引第三方库。
3. **不重复引入 lodash** 等与 rattail 职责重叠的库。
4. HTTP 请求：`createAxle`（rattail/axle）。
5. 表单校验：rattail/ruler-factory。
6. 枚举：`enumOf`（见 `enum.md`）。
7. 不确定 rattail 有什么时，加载 `$skill: rattail` 查 references，**不要凭记忆猜 API**。

## 边界

- 不因为「rattail 有」就引入当前需求用不到的 API（禁止额外编程）。
- 不把业务语义塞进通用 utils；utils 只放真正通用的纯转换。
