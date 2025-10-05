# 智能体资讯处理系统

基于 Mastra 框架构建的多智能体资讯处理平台，负责自动化抓取新闻、完成内容分析与重写，并提供前端代码审查 Agent 以支持多场景的生产力需求。

## 项目概览

- 通过 `newsProcessingWorkflow` 串联资讯抓取、去重、质量评估、重写与格式化输出
- 默认集成 DeepSeek Chat/Coder 模型，并兼容 OpenAI API
- 提供前端代码审查 Agent，可在本地服务或 CI 中直接调用
- 统一使用 LibSQL 内存存储与 Pino 日志，便于开发调试

## 功能细节

### 资讯处理流水线

| 阶段     | 说明                                                                    | 关键实现                                                 |
| -------- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| 采集聚合 | 支持 RSS、NewsAPI、网页抓取三类数据源，并自动过滤超出时间窗口内容       | `rssFetcherTool`、`newsApiFetcherTool`、`webScraperTool` |
| 去重排序 | 基于标题指纹去重，并按发布时间降序排列                                  | `removeDuplicateArticles` 辅助函数                       |
| 质量审查 | `contentAnalyzerAgent` 以流式方式给出 1-10 评分，失效时回退到长度启发式 | workflow `analyze-content` 步骤                          |
| 重写优化 | `contentRewriterAgent` 根据目标风格/受众输出 JSON，缺省时保留原稿       | workflow `rewrite-content` 步骤                          |
| 可发布化 | 调用格式化工具生成标题、摘要、标签、阅读时间等指标                      | `articleGeneratorTool`、`contentFormatterTool`           |

### 工具与组件速览

- `src/mastra/tools/news-fetcher-tool.ts`：聚合抓取器，内置新浪/网易/腾讯 RSS，支持自定义 API Key 与 CSS 选择器
- `src/mastra/tools/format-converter-tool.ts`：标题优化、内容分段、Emoji 增强、SEO 标题裁剪、阅读时间估算
- `src/mastra/agents/content-processor-agent.ts`：三段式内容处理智能体（处理、分析、重写）共享 `LibSQLStore` 记忆
- `src/mastra/agents/frontend-code-review-agent.ts`：DeepSeek Coder 驱动，输出严格 JSON，包含问题列表与 `suggestedDiffs`
- `scripts/run-example.ts`：交互式 CLI，可选择运行基础示例、定制源或工具测试并查看当前配置

### 数据与日志

- **记忆与缓存**：所有 Agent 使用 `LibSQLStore`（默认 `file:../mastra.db`）存储对话与上下文，避免重复请求
- **日志体系**：`PinoLogger` 统一输出 `info` 级别日志，可通过 `LOG_LEVEL` 调整
- **配置验证**：`src/config/index.ts` 采用 Zod 校验并允许通过 `RSS_SOURCES` JSON 覆盖默认源

## 目录结构

```
.
├── src
│   ├── config/                 # AI 服务、新闻源与运行参数配置
│   └── mastra/
│       ├── agents/             # 内容处理与代码审查智能体定义
│       ├── tools/              # 资讯抓取、格式转换等可复用工具
│       └── workflows/          # Mastra 工作流编排（newsProcessingWorkflow）
├── examples/                   # 关键功能示例与手动回归脚本
├── scripts/                    # 实用脚本（如 run-example.ts）
├── docs/                       # 补充文档与演示素材
└── AGENTS.md                   # 贡献者指南（智能体开发注意事项）
```

## 环境与安装

### 前置条件

- Node.js ≥ 20.9.0
- 推荐使用 `pnpm`（也可使用 `npm`，但仓库提供了 `pnpm-lock.yaml`）

### 安装步骤

```bash
git clone <your-repo-url>
cd my-mastra-app
pnpm install
cp .env.example .env
```

## 环境变量说明

- `DEEPSEEK_API_KEY`：必填，默认调用 DeepSeek 模型处理内容与代码
- `OPENAI_API_KEY`：可选，若业务需切换 OpenAI，可保持 `config.openai` 校验通过
- `NEWS_API_KEY`：可选，启用 NewsAPI 抓取时提供
- `RSS_SOURCES`：JSON 字符串，重写默认 RSS 列表（示例见 `examples/custom-sources.ts`）
- `DATABASE_URL`：LibSQL 连接地址，开发默认 `file:./mastra.db`
- `LOG_LEVEL`：日志级别，支持 `debug|info|warn|error`

## 快速上手

1. 启动服务：`pnpm dev`（默认在 `http://localhost:4111` 暴露 `/api/agents/*` 接口）
2. 运行资讯处理示例：`pnpm run example:basic`
3. 自定义新闻源示例：`pnpm run example:custom`
4. 交互式菜单：`pnpm run example`（调用 `scripts/run-example.ts`）

在业务代码中可直接运行工作流：

```ts
import { mastra } from "./src/mastra";
import { getNewsSourcesConfig, getProcessingConfig } from "./src/config";

const result = await mastra.runWorkflow("newsProcessingWorkflow", {
  sources: getNewsSourcesConfig(),
  ...getProcessingConfig(),
});
console.log(`完成处理：${result.summary.totalProcessed} 篇文章`);
```

## 常用命令

| 命令                      | 作用                                             |
| ------------------------- | ------------------------------------------------ |
| `pnpm dev`                | 启动 Mastra 开发服务，热加载 `.mastra` 路由      |
| `pnpm build`              | 构建可部署产物                                   |
| `pnpm start`              | 使用构建结果启动生产模式实例                     |
| `pnpm run example:basic`  | 执行基础资讯处理示例                             |
| `pnpm run example:custom` | 测试自定义新闻源                                 |
| `pnpm run example`        | 打开交互式 CLI，聚合示例与工具测试               |
| `pnpm run test:deepseek`  | 验证 DeepSeek API 配置与 Content Processor Agent |
| `pnpm run test:tools`     | 快速检查抓取及格式化工具链                       |

## Mastra 工作流与智能体

- **newsProcessingWorkflow**：链式执行四大步骤，所有输入输出均用 Zod 校验，失败时自动记录警告继续处理
- **contentProcessor / Analyzer / Rewriter Agents**：协同完成资讯评估、重写与结构化输出，使用 DeepSeek Chat 流式响应并带有 JSON fallback 逻辑
- **frontendCodeReviewAgent**：DeepSeek Coder 驱动的代码审查专家，覆盖正确性、类型、性能、安全等维度，默认返回结构化 JSON（包含 `summary`、`score`、`findings`、`suggestedDiffs`、`checklist`）便于流水线消费

## HTTP 接口

启动本地服务后，可通过 HTTP 调用前端代码审查 Agent：

```http
POST http://localhost:4111/api/agents/frontendCodeReviewAgent/generate
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "请审查以下组件并指出潜在性能问题: ..."
    }
  ]
}
```

响应为严格 JSON，可直接解析字段：

```json
{
  "summary": "整体质量良好，需优化 useEffect 依赖...",
  "score": 78,
  "findings": [ { "id": "perf-001", "severity": "high", ... } ],
  "suggestedDiffs": [ { "file": "src/App.tsx", "before": "...", "after": "..." } ],
  "checklist": { "correctness": true, "types": false, ... }
}
```

如需流式返回，可改用 `POST /api/agents/frontendCodeReviewAgent/stream` 获取 SSE。

## 自定义与扩展

- 在 `.env` 中设置 `RSS_SOURCES`（JSON 数组）即可覆盖默认新闻列表
- 在 `examples/` 下复制脚本快速验证新工具或工作流，验证通过后迁移至 `src/`
- 新增工具文件建议放置于 `src/mastra/tools`，并在工作流中通过 `createTool`/`createStep` 引入
- `DEEPSEEK_MODELS` 支持 `CHAT` 与 `CODER`，可在代理中二选一或混合调用
- 如需切换至 OpenAI，只需在 `src/config/deepseek.ts` 中替换为 `createOpenAI` 配置并提供 `OPENAI_API_KEY`

## 故障排除

- **AI 服务连接失败**：确认密钥有效、网络可达，运行 `pnpm run test:deepseek` 验证
- **NewsAPI 请求报错**：检查 `NEWS_API_KEY` 是否设置，或确认 `category`、`query` 参数合法
- **RSS 抓取为空**：确认源站可访问，或调低 `hoursBack` 扩大时间窗口
- **JSON 解析失败**：AI 返回非结构化文本时，工作流会降级使用原始文章；建议在重写提示中明确 JSON 模板

## 贡献

欢迎提交 Issue 与 PR，请先阅读 `AGENTS.md` 中的贡献指南，统一命名、命令与测试约定。

## 许可证

MIT License
