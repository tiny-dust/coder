# rattail 工具链优先（硬性）

适用：TS / Vue 需要工具函数、请求、表单校验、lint/fmt 时。先读 `principles.md`。细节以 `$skill: rattail` references 为准，不凭记忆猜 API。

## 规则

1. 任何工具函数需求（数组/对象/字符串/数学/DOM/文件/防抖节流等）→ **先查 rattail**，有则直接用。
2. rattail 没有等价能力 → 才允许项目内新写或引第三方库。
3. **不重复引入 lodash** 等与 rattail 职责重叠的库。
4. HTTP 请求：`createAxle`（`rattail/axle`）——渐进式请求层：实例 + 拦截器 + `createApi` 工厂；放 `src/lib/` 或项目惯例目录。
5. 表单校验：`rulerFactory`（`rattail/ruler-factory`），链式规则，可对接 Element Plus 等。
6. 枚举：`enumOf`（见 `enum.md`）。
7. lint/fmt（项目用 vite-plus 时）：`import { lint, fmt } from 'rattail/vite-plus'`；生成代码可对客户端关闭噪音规则。
8. 不确定 rattail 有什么时，加载 `$skill: rattail` 查 references。

## 引入新工具函数流程

1. 先查：项目已有导出 + rattail + `package.json` 现有依赖。
2. 有等价 → 复用；无等价 → 新建到 `src/utils/`（非 `useXxx`）。
3. 用户显式指定其他工具库 → 以用户为准，不重复引 rattail 同职责部分。

## 边界

- 不因为「rattail 有」就引入当前需求用不到的 API（禁止额外编程）。
- 不把业务语义塞进通用 utils；utils 只放真正通用的纯转换。
