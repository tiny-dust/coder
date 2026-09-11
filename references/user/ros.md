# 用户习惯：ros

### ros-001: 协议类型一律生成，禁止手写
- 规则：ROS 消息/服务类型从消息定义仓库生成；REST API 类型从 OpenAPI 生成。协议变更后必须重跑生成命令，禁止手写或复制粘贴协议类型。
- 来源：2026-09-11 仓库归纳:/Users/reynold/Company/Tars/awr_hmi_refactor
- 适用：ros / typescript
- 状态：active

### ros-002: ROS 调用只走类型安全封装
- 规则：禁止直接调用 roslib 的 Topic/Service。统一经 `useRos()` 的 `subscribe`/`publish`/`callService`；TopicMap/ServiceMap 做键到类型的映射，保证调用侧类型安全。
- 来源：2026-09-11 仓库归纳:/Users/reynold/Company/Tars/awr_hmi_refactor
- 适用：ros
- 状态：active
