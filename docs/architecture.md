# 智能体资讯发布系统架构设计

## 系统概述

本系统基于 Mastra 框架构建，实现从资讯获取到微信公众号发布的全自动化流程。

## 核心模块

### 1. 资讯获取模块 (News Fetcher)
- **RSS Feed 解析器**: 支持多个RSS源的并行获取
- **新闻API集成**: 集成主流新闻API（NewsAPI、聚合数据等）
- **网页抓取器**: 针对特定网站的内容抓取
- **去重机制**: 基于内容相似度的智能去重

### 2. 内容处理模块 (Content Processor)
- **AI分析器**: 使用GPT-4分析文章质量和相关性
- **内容总结器**: 生成文章摘要和关键点
- **内容重写器**: 根据公众号风格重新编写内容
- **情感分析**: 分析内容情感倾向，确保合适的发布

### 3. 格式转换模块 (Format Converter)
- **标题优化器**: 生成吸引人的标题和副标题
- **段落重构器**: 优化段落结构，提高可读性
- **Emoji添加器**: 智能添加合适的emoji表情
- **图片处理器**: 处理和优化配图

### 4. 发布模块 (Publisher)
- **微信公众号API**: 集成微信公众号发布接口
- **发布调度器**: 支持定时发布和批量发布
- **发布状态跟踪**: 跟踪发布状态和结果
- **审核机制**: 发布前的人工审核流程

## 数据流程

```
RSS/API/Web → 内容获取 → 去重过滤 → AI分析 → 内容重写 → 格式转换 → 审核 → 发布
```

## 推荐的新闻数据源

### 免费数据源
1. **RSS Feeds**
   - 新浪新闻: http://rss.sina.com.cn/news/china/focus15.xml
   - 网易新闻: http://news.163.com/special/00011K6L/rss_newstop.xml
   - 腾讯新闻: https://news.qq.com/newsgn/rss_newsgn.xml

2. **开放API**
   - NewsAPI (免费额度): https://newsapi.org/
   - 聚合数据新闻API: https://www.juhe.cn/docs/api/id/235

### 付费数据源
1. **专业新闻API**
   - 百度新闻API
   - 今日头条开放平台
   - 微博开放平台

## 技术栈

- **框架**: Mastra
- **AI模型**: OpenAI GPT-4
- **数据库**: LibSQL
- **RSS解析**: rss-parser
- **HTTP客户端**: axios
- **网页解析**: cheerio
- **加密**: crypto-js

## 配置管理

所有敏感信息通过环境变量管理：
- `OPENAI_API_KEY`: OpenAI API密钥
- `WECHAT_APP_ID`: 微信公众号AppID
- `WECHAT_APP_SECRET`: 微信公众号AppSecret
- `NEWS_API_KEY`: 新闻API密钥
- `RSS_SOURCES`: RSS源配置
