# 用户习惯：vue3

### vue-001: 页面组件带 Page 前缀
- 视图页文件名使用 `Page` 前缀：`PageHome.vue`、`PageUserList.vue`；目录仍按路由放 `src/pages/**`。
- 规则：新建路由页必须 `Page` 前缀；与页面强绑定的子组件用 `The` 前缀（`TheUserCard.vue`）。
- 来源：2026-09-11 收工确认
- 适用：vue3
- 状态：active

### vue-002: Pinia store 用 setup 风格单文件
- 规则：每个 store 一个文件 `src/store/<domain>.ts`，导出 `use<Domain>Store`；禁止 options 风格混用。store 只放跨页面共享状态。
- 来源：2026-09-11 用户纠偏
- 适用：vue3
- 状态：active
