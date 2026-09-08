---
name: coder
description: Vue 3 与 TypeScript 开发总调度。适用于创建、修改、审查和调试 .vue 或 .ts 文件。根据编辑文件后缀自动应用对应规则：.vue 使用 Vue SFC 结构与组件复用规范；.ts 复用相同的先查后写、类型优先、最小改动流程。开发前优先运行 scripts/query.js 按名称查询已有组件和工具函数，避免全量读取项目文档和重复造轮子。复杂场景再分派到 vue3-project-init、vue3-dev 或 vue3-deps。
---

# Coder

## 总原则

**先识别后缀，先查询后写，最小实现，完成验证。** 不为需求外的功能建立抽象，不把项目源码或说明全量读入上下文。

## 文件后缀路由

- `.vue`：加载 `references/sfc-structure.md`，遵守 Vue 3 `<script setup>`、模板、样式和组件接口规则。
- `.ts`：复用本技能的查询、复用优先、类型优先、错误处理和验证规则；工具函数优先查询第三方依赖与项目已有导出。
- 同一任务同时修改 `.vue` 与 `.ts`：使用同一套工作流，按文件后缀叠加规则，不拆成相互矛盾的流程。
- 其他后缀：不要自动套用 Vue 规则；按项目现有技能或通用开发流程处理。

## 查询优先

需要新增组件、工具函数、请求器、组合式函数或第三方 API 前，优先运行：

```bash
node ~/.agents/skills/coder/scripts/query.js --root <项目根目录> <组件名或函数名>
```

常用选项：

```bash
node ~/.agents/skills/coder/scripts/query.js --root <项目根目录> --kind component BaseButton
node ~/.agents/skills/coder/scripts/query.js --root <项目根目录> --kind function formatDate --json
node ~/.agents/skills/coder/scripts/query.js --root <项目根目录> --refresh
```

脚本首次运行或使用 `--refresh` 时建立项目 `.coder/index.json`；普通查询只读取索引，不读取 `.docs` 或全部源码。索引不包含源码正文和敏感配置，可提交也可加入项目 `.gitignore`。源码发生变化后，在下一次开发前用 `--refresh` 更新。

查询结果未命中时，才针对相关目录做小范围源码检查。禁止因为未命中就全量读取项目。

## 开发工作流

1. 确认任务涉及的文件后缀和项目根目录。
2. 查询相关组件、函数、依赖和组合式函数；记录可复用结果。
3. 读取必要的 references 和目标文件，明确现有接口与约束。
4. 实现最小改动。项目已有组件优先复用；新函数优先加入职责相同的已有文件。
5. `.vue` 文件保持 SFC 区域顺序和清晰的组件边界；`.ts` 文件使用明确类型、窄化输入和可测试的纯函数边界。
6. 异步边界按 `references/error-handling.md` 判断是否需要 try/catch，不能吞掉错误或重复处理错误。
7. 运行项目已有的类型检查、测试和构建命令；至少验证受影响文件相关路径。
8. 源码变更后按需执行 `query.js --refresh` 更新索引。项目已有 `.docs` 时可遵守其既有任务日志约定，但本技能不强制创建或维护 `.docs` 全量清单。

## 子技能路由

- 新建项目、脚手架和基础依赖选型：`$skill: vue3-project-init`
- Vue 页面、组件和功能实现：`$skill: vue3-dev`
- 依赖清理、工具链和未使用代码分析：`$skill: vue3-deps`
- Vue 测试：`$skill: vue-testing-best-practices`
- Pinia：`$skill: vue-pinia-best-practices`
- Router：`$skill: vue-router-best-practices`

只在任务确实需要时加载子技能，避免重复加载规则。

## 共享资源

- `scripts/query.js`：增量索引与按名称查询组件/函数
- `references/sfc-structure.md`：Vue SFC 结构规范
- `references/error-handling.md`：错误处理规范
- `references/doc-formats.md`：旧 `.docs` 结构的兼容参考，仅在维护已有项目文档时使用
