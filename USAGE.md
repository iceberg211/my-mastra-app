# 使用指南

## 🚀 快速开始

### 1. 环境配置

首先复制环境变量模板并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，至少需要配置 OpenAI API 密钥：

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. 运行示例

使用交互式菜单：

```bash
npm run example
```

或直接运行特定示例：

```bash
# 基础使用示例
npm run example:basic

# 自定义新闻源示例  
npm run example:custom

# 工具测试
npm run test:tools
```

## 📊 系统工作流程

### 完整流程

```typescript
import { mastra } from './src/mastra';

const result = await mastra.runWorkflow('newsProcessingWorkflow', {
  sources: [
    {
      type: 'rss',
      name: '新浪新闻',
      url: 'http://rss.sina.com.cn/news/china/focus15.xml',
      category: '国内新闻'
    }
  ],
  limit: 10,           // 每个源获取10篇文章
  hoursBack: 24,       // 获取24小时内的文章
  minQualityScore: 6,  // 最低质量分数6分
  maxArticles: 5,      // 最多处理5篇文章
  targetStyle: 'engaging',    // 吸引人的写作风格
  targetAudience: 'general'   // 一般受众
});
```

### 分步执行

如果需要更细粒度的控制，可以分步执行：

```typescript
// 1. 获取新闻
const fetchResult = await rssFetcherTool.execute({
  context: {
    sources: [...],
    limit: 10,
    hoursBack: 24
  }
});

// 2. 优化标题
const titleResult = await titleOptimizerTool.execute({
  context: {
    originalTitle: article.title,
    content: article.content,
    category: article.category,
    style: 'engaging'
  }
});

// 3. 格式化内容
const formatResult = await contentFormatterTool.execute({
  context: {
    title: titleResult.optimizedTitle,
    content: article.content,
    category: article.category,
    addEmojis: true,
    addFormatting: true
  }
});
```

## 🔧 配置选项

### 新闻源类型

#### RSS源
```typescript
{
  type: 'rss',
  name: '源名称',
  url: 'RSS地址',
  category: '分类'
}
```

#### API源
```typescript
{
  type: 'api',
  name: 'NewsAPI',
  url: 'API地址',
  category: '分类',
  apiKey: 'API密钥'
}
```

#### 网页抓取
```typescript
{
  type: 'web',
  name: '网站名称',
  url: '网页地址',
  category: '分类'
}
```

### 处理参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `limit` | number | 10 | 每个源获取的文章数量 |
| `hoursBack` | number | 24 | 获取多少小时内的文章 |
| `minQualityScore` | number | 6 | 最低质量分数(1-10) |
| `maxArticles` | number | 5 | 最多处理文章数量 |
| `targetStyle` | string | 'engaging' | 目标写作风格 |
| `targetAudience` | string | 'general' | 目标受众 |

### 写作风格选项

- `professional`: 专业风格
- `casual`: 轻松风格  
- `engaging`: 吸引人风格
- `news`: 新闻风格

## 📝 输出结果

### 处理后的文章格式

```typescript
{
  title: "优化后的标题",
  subtitle: "副标题(可选)",
  content: "格式化的文章内容",
  summary: "文章摘要",
  tags: ["标签1", "标签2"],
  category: "文章分类",
  estimatedReadTime: 3,  // 预计阅读时间(分钟)
  wordCount: 500,        // 字数统计
  author: "作者",
  source: "来源",
  publishDate: "2024-01-01T00:00:00.000Z"
}
```

### 统计信息

```typescript
{
  summary: {
    totalProcessed: 5,      // 处理的文章总数
    averageQuality: 7.2,    // 平均质量分数
    categories: ["科技", "财经"]  // 涉及的分类
  }
}
```

## 🛠️ 自定义开发

### 添加新的新闻源

1. 在 `src/mastra/tools/news-fetcher-tool.ts` 中添加新的获取逻辑
2. 更新配置文件中的源列表

### 自定义内容处理

1. 修改 `src/mastra/agents/content-processor-agent.ts` 中的智能体指令
2. 调整处理逻辑以适应特定需求

### 自定义格式转换

1. 在 `src/mastra/tools/format-converter-tool.ts` 中修改格式化规则
2. 添加新的emoji映射或格式化选项

## 🐛 故障排除

### 常见问题

1. **OpenAI API 错误**
   - 检查API密钥是否正确
   - 确认账户有足够的额度

2. **RSS获取失败**
   - 检查RSS URL是否有效
   - 确认网络连接正常

3. **内容处理超时**
   - 减少 `maxArticles` 参数
   - 检查网络连接稳定性

### 调试模式

设置环境变量启用详细日志：

```env
LOG_LEVEL=debug
```

## 📈 性能优化

1. **并发处理**: 系统支持多个新闻源的并发获取
2. **缓存机制**: 可以添加Redis缓存来避免重复处理
3. **批量处理**: 一次处理多篇文章以提高效率

## 🔒 安全注意事项

1. 妥善保管API密钥，不要提交到版本控制
2. 定期轮换API密钥
3. 监控API使用量，避免超出限制
4. 遵守各新闻源的使用条款
