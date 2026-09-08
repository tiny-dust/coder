# 旧 `.docs` 兼容参考

`coder` 不再要求项目维护 `.docs/components.md`、`.docs/utils.md`、`task-log.md` 或完整依赖图。新项目优先使用 `scripts/query.js` 建立 `.coder/index.json`，然后按组件名、函数名、导出名或路径查询。

如果目标项目已经存在 `.docs`，开发时尊重项目自身约定即可，不需要为了使用 `coder` 全量读取或重建这些文件。只有用户明确要求维护旧文档时，才参考历史格式。

## 新查询流程

```bash
node scripts/query.js --root <项目根目录> --refresh
node scripts/query.js --root <项目根目录> --kind component <组件名>
node scripts/query.js --root <项目根目录> --kind function <函数名>
```

查询只返回命中的索引项；未命中时再对相关源码做小范围检查。
