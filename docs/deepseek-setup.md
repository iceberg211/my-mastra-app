# DeepSeek 配置指南

## 概述

为了解决 OpenAI API 的网络连接问题，我们已经将 Content Processor Agent 切换到使用 DeepSeek API。DeepSeek 是一个国内的 AI 服务提供商，提供与 OpenAI 兼容的 API 接口。

## 配置步骤

### 1. 获取 DeepSeek API Key

1. 访问 [DeepSeek 官网](https://platform.deepseek.com/)
2. 注册账号并登录
3. 在控制台中创建 API Key
4. 复制生成的 API Key

### 2. 配置环境变量

在项目根目录的 `.env` 文件中添加 DeepSeek API Key：

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

将 `your_deepseek_api_key_here` 替换为你从 DeepSeek 获取的实际 API Key。

### 3. 测试配置

运行测试脚本验证配置是否正确：

```bash
npm run test:deepseek
```

## 已修改的文件

1. **src/config/deepseek.ts** - 新增 DeepSeek 配置文件
2. **src/mastra/agents/content-processor-agent.ts** - 将所有 Agent 切换到使用 DeepSeek
3. **.env** - 添加 DeepSeek API Key 配置
4. **examples/test-deepseek.ts** - 新增测试文件
5. **package.json** - 添加测试脚本

## 使用的模型

- **deepseek-chat**: 用于内容处理、分析和重写任务
- **deepseek-coder**: 可用于代码相关任务（如需要）

## 优势

1. **网络稳定**: DeepSeek 服务器在国内，网络连接更稳定
2. **API 兼容**: 与 OpenAI API 完全兼容，无需修改业务逻辑
3. **成本效益**: DeepSeek 的定价通常比 OpenAI 更有竞争力
4. **中文优化**: 对中文内容处理有更好的优化

## 故障排除

如果遇到问题，请检查：

1. API Key 是否正确设置
2. 网络连接是否正常
3. DeepSeek 服务是否可用
4. 环境变量是否正确加载

## 回退方案

如果需要切换回 OpenAI，只需要：

1. 修改 `src/mastra/agents/content-processor-agent.ts`
2. 将 `deepseek(DEEPSEEK_MODELS.CHAT)` 改回 `openai('gpt-4o')`
3. 重新导入 `openai` 而不是 `deepseek`
