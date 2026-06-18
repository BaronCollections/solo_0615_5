# 智慧校园 (Smart Campus)

Vue 3 + TypeScript + Vite 项目模板。使用 Vue 3 `<script setup>` 单文件组件，详情请参考 [script setup 文档](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup)。

## 本地质量检查

项目提供 `npm run check` 命令，用于在提交代码前进行完整的本地质量检查。该命令会依次执行以下三个环节，**任一环节失败都会导致整个检查失败**：

1. **类型检查** - `vue-tsc -b`：验证 TypeScript 类型正确性
2. **单元测试** - `vitest run`：运行所有单元测试用例
3. **生产构建** - `vite build`：验证生产环境打包是否正常

### 用法

```bash
# 执行完整质量检查（推荐在提交代码前运行）
npm run check
```

### 其他可用命令

```bash
# 启动开发服务器
npm run dev

# 仅执行生产构建（含类型检查）
npm run build

# 预览生产构建结果
npm run preview

# 运行单元测试
npm run test

# 运行单元测试（监听模式）
npm run test:watch
```

## 项目配置与 IDE 支持

更多关于项目配置和 IDE 支持的信息，请参考 [Vue 官方 TypeScript 指南](https://vuejs.org/guide/typescript/overview.html#project-setup)。
