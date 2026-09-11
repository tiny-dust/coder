# 用户习惯：data

### data-001: localforage 写入前剥离 Vue Proxy
- 规则：用 localforage（IndexedDB）持久化 Vue 响应式数据时，写入前 `JSON.parse(JSON.stringify(data))` 剥离 Proxy；同时设置条数上限与保留时长裁剪。
- 来源：2026-09-11 仓库归纳:/Users/reynold/Company/Tars/awr_hmi_refactor
- 适用：vue3 / data
- 状态：active
