import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import Parser from 'rss-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';

// 新闻文章接口
interface NewsArticle {
  title: string;
  content: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: string;
  author?: string;
  category?: string;
}

// RSS解析器
const rssParser = new Parser({
  customFields: {
    item: ['description', 'content:encoded', 'dc:creator']
  }
});

// 默认RSS源配置
const DEFAULT_RSS_SOURCES = [
  {
    name: '新浪新闻',
    url: 'http://rss.sina.com.cn/news/china/focus15.xml',
    category: '国内新闻'
  },
  {
    name: '网易新闻',
    url: 'http://news.163.com/special/00011K6L/rss_newstop.xml',
    category: '热点新闻'
  },
  {
    name: '腾讯科技',
    url: 'https://news.qq.com/newsgn/rss_newsgn.xml',
    category: '科技新闻'
  }
];

// RSS获取工具
export const rssFetcherTool = createTool({
  id: 'fetch-rss-news',
  description: '从RSS源获取最新新闻资讯',
  inputSchema: z.object({
    sources: z.array(z.object({
      name: z.string(),
      url: z.string(),
      category: z.string().optional()
    })).optional().describe('RSS源列表，如果不提供则使用默认源'),
    limit: z.number().default(10).describe('每个源获取的文章数量限制'),
    hoursBack: z.number().default(24).describe('获取多少小时内的文章')
  }),
  outputSchema: z.object({
    articles: z.array(z.object({
      title: z.string(),
      content: z.string(),
      summary: z.string(),
      url: z.string(),
      publishedAt: z.string(),
      source: z.string(),
      author: z.string().optional(),
      category: z.string().optional()
    })),
    totalCount: z.number(),
    sources: z.array(z.string())
  }),
  execute: async ({ context }) => {
    const { sources = DEFAULT_RSS_SOURCES, limit = 10, hoursBack = 24 } = context;
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    
    const allArticles: NewsArticle[] = [];
    const processedSources: string[] = [];

    for (const source of sources) {
      try {
        console.log(`正在获取 ${source.name} 的RSS内容...`);
        const feed = await rssParser.parseURL(source.url);
        
        const articles = feed.items
          .slice(0, limit)
          .filter(item => {
            const pubDate = new Date(item.pubDate || item.isoDate || '');
            return pubDate > cutoffTime;
          })
          .map(item => ({
            title: item.title || '',
            content: item['content:encoded'] || item.content || item.contentSnippet || '',
            summary: item.contentSnippet || item.description || '',
            url: item.link || '',
            publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
            source: source.name,
            author: item['dc:creator'] || item.creator,
            category: source.category
          }));

        allArticles.push(...articles);
        processedSources.push(source.name);
        
        console.log(`从 ${source.name} 获取到 ${articles.length} 篇文章`);
      } catch (error) {
        console.error(`获取 ${source.name} RSS失败:`, error);
      }
    }

    // 按发布时间排序
    allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return {
      articles: allArticles,
      totalCount: allArticles.length,
      sources: processedSources
    };
  }
});

// 新闻API获取工具
export const newsApiFetcherTool = createTool({
  id: 'fetch-news-api',
  description: '从新闻API获取最新资讯',
  inputSchema: z.object({
    apiKey: z.string().describe('新闻API密钥'),
    query: z.string().optional().describe('搜索关键词'),
    category: z.string().optional().describe('新闻分类'),
    country: z.string().default('cn').describe('国家代码'),
    pageSize: z.number().default(20).describe('返回文章数量')
  }),
  outputSchema: z.object({
    articles: z.array(z.object({
      title: z.string(),
      content: z.string(),
      summary: z.string(),
      url: z.string(),
      publishedAt: z.string(),
      source: z.string(),
      author: z.string().optional(),
      category: z.string().optional()
    })),
    totalResults: z.number()
  }),
  execute: async ({ context }) => {
    const { apiKey, query, category, country, pageSize } = context;
    
    try {
      let url = `https://newsapi.org/v2/top-headlines?country=${country}&pageSize=${pageSize}&apiKey=${apiKey}`;
      
      if (query) {
        url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=${pageSize}&apiKey=${apiKey}`;
      } else if (category) {
        url += `&category=${category}`;
      }

      const response = await axios.get(url);
      const data = response.data;

      const articles: NewsArticle[] = data.articles.map((article: any) => ({
        title: article.title || '',
        content: article.content || article.description || '',
        summary: article.description || '',
        url: article.url || '',
        publishedAt: article.publishedAt || new Date().toISOString(),
        source: article.source?.name || 'NewsAPI',
        author: article.author,
        category: category
      }));

      return {
        articles,
        totalResults: data.totalResults || articles.length
      };
    } catch (error) {
      console.error('NewsAPI获取失败:', error);
      throw new Error(`NewsAPI获取失败: ${error}`);
    }
  }
});

// 网页内容抓取工具
export const webScraperTool = createTool({
  id: 'scrape-web-content',
  description: '从指定网页抓取新闻内容',
  inputSchema: z.object({
    url: z.string().describe('要抓取的网页URL'),
    titleSelector: z.string().default('h1, .title, .headline').describe('标题选择器'),
    contentSelector: z.string().default('.content, .article-content, .post-content').describe('内容选择器'),
    authorSelector: z.string().optional().describe('作者选择器'),
    dateSelector: z.string().optional().describe('日期选择器')
  }),
  outputSchema: z.object({
    title: z.string(),
    content: z.string(),
    summary: z.string(),
    url: z.string(),
    publishedAt: z.string(),
    source: z.string(),
    author: z.string().optional()
  }),
  execute: async ({ context }) => {
    const { url, titleSelector, contentSelector, authorSelector, dateSelector } = context;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      const title = $(titleSelector).first().text().trim();
      const content = $(contentSelector).first().text().trim();
      const author = authorSelector ? $(authorSelector).first().text().trim() : undefined;
      const dateText = dateSelector ? $(dateSelector).first().text().trim() : '';
      
      // 生成摘要（取前200字符）
      const summary = content.length > 200 ? content.substring(0, 200) + '...' : content;
      
      // 解析日期
      let publishedAt = new Date().toISOString();
      if (dateText) {
        const parsedDate = new Date(dateText);
        if (!isNaN(parsedDate.getTime())) {
          publishedAt = parsedDate.toISOString();
        }
      }
      
      // 从URL提取域名作为来源
      const domain = new URL(url).hostname;
      
      return {
        title,
        content,
        summary,
        url,
        publishedAt,
        source: domain,
        author
      };
    } catch (error) {
      console.error('网页抓取失败:', error);
      throw new Error(`网页抓取失败: ${error}`);
    }
  }
});
