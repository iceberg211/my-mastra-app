# 智能体资讯处理系统架构设计

## 系统概述

本系统基于 Mastra 框架构建，实现从资讯获取到内容格式转换的智能化处理流程，专注于将原始新闻资讯转换为适合发布的高质量内容。

## 核心模块

### 1. 资讯获取模块 (News Fetcher)
- **RSS Feed 解析器**: 支持多个RSS源的并行获取
- **新闻API集成**: 集成主流新闻API（NewsAPI、聚合数据等）
- **网页抓取器**: 针对特定网站的内容抓取
- **去重机制**: 基于内容相似度的智能去重

### 2. 内容处理模块 (Content Processor)
- **AI分析器**: 使用GPT-4分析文章质量和相关性
- **内容总结器**: 生成文章摘要和关键点
- **内容重写器**: 根据目标风格重新编写内容
- **情感分析**: 分析内容情感倾向，确保内容质量

### 3. 格式转换模块 (Format Converter)
- **标题优化器**: 生成吸引人的标题和副标题
- **段落重构器**: 优化段落结构，提高可读性
- **Emoji添加器**: 智能添加合适的emoji表情
- **内容格式化**: 转换为标准化的文章格式

## 数据流程

```
RSS/API/Web → 内容获取 → 去重过滤 → AI分析 → 内容重写 → 格式转换 → 输出结果
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
- `NEWS_API_KEY`: 新闻API密钥
- `RSS_SOURCES`: RSS源配置

## 输出格式

系统输出标准化的文章格式：

- **标题**: 优化后的主标题和副标题
- **摘要**: 文章核心内容总结
- **正文**: 格式化的文章内容
- **标签**: 自动提取的关键词标签
- **元数据**: 字数统计、阅读时间等信息
