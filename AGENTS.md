# Repository Guidelines

## 项目结构与模块组织

- `src/mastra` 聚合智能体、工具与工作流；`agents` 存放具体智能体实现，`tools` 保持轻量工具函数，`workflows` 描述跨智能体编排。
- `src/config` 提供外部服务配置与凭证加载逻辑，默认使用 `dotenv` 与 DeepSeek 适配器。
- `scripts` 与 `examples` 提供运行示例与调试脚本，推荐把实验性逻辑先落在该目录再迁入 `src`。
- `docs` 保存发布文档与演示素材，新增说明请确保目录内引用路径正确。

## 构建、测试与开发命令

- `pnpm dev`：启动 Mastra 本地开发服务，默认监听 `.mastra` 路由配置。
- `pnpm build`：生成可部署的 Mastra 产物，提交前请确保构建通过。
- `pnpm start`：使用构建结果运行生产实例，用于验证部署行为。
- `pnpm run example:basic` 或 `pnpm run example:custom`：运行关键用例，作为手动回归基线。

## 代码风格与命名规范

- 使用 TypeScript、ESM 模块与 2 空格缩进；保持文件内导出顺序为类型、常量、函数、默认导出。
- 智能体命名采用 `xxx-agent.ts`，工具文件采用 `verb-noun-tool.ts` 或 `*-utils.ts`。
- 建议安装编辑器 Prettier/ESLint 插件，并遵循 `zod` 校验定义放在文件顶部的习惯。

## 测试指南

- 当前项目尚未引入自动化测试框架，新增功能请在 `examples` 下补充对应用例或在 `scripts/run-example.ts` 中编排演练步骤。
- 计划引入 `vitest` 时，请以 `*.spec.ts` 命名并置于 `src/mastra` 对应目录的 `__tests__` 子目录。
- 提交前至少运行一次核心示例命令并记录关键输出，确保关键路径可复现。

## 提交与合并规范

- 遵循类 Conventional Commits 样式，使用 `feat:`、`fix:`、`chore:` 等前缀并简述中文变更意图，例如 `feat: 增加内容处理智能体提示词`。
- PR 描述应包含背景、解决方案、验证方式以及相关截图或日志；若涉及配置变更，请列出所需环境变量。
- 链接相关 Issue 或需求单，并在描述中标注受影响的代理、工具和工作流，便于评审定位。

## 安全与配置提示

- `.env` 应存放在根目录，保证 DeepSeek、OpenAI 等密钥仅通过环境变量访问，切勿提交到版本库。
- 如需新增数据源，请在 `src/config` 中集中管理连接信息，并更新 `docs` 说明部署方需准备的权限或网络白名单。
