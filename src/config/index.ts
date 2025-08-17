import { z } from 'zod';

// 新闻源配置schema
const newsSourceSchema = z.object({
  type: z.enum(['rss', 'api', 'web']),
  name: z.string(),
  url: z.string(),
  category: z.string().optional(),
  apiKey: z.string().optional()
});

// 配置schema
const configSchema = z.object({
  openai: z.object({
    apiKey: z.string().min(1, 'OpenAI API密钥不能为空')
  }),
  news: z.object({
    apiKey: z.string().optional(),
    sources: z.array(newsSourceSchema).default([]),
    defaultLimit: z.number().default(10),
    defaultHoursBack: z.number().default(24),
    minQualityScore: z.number().min(1).max(10).default(6),
    maxArticles: z.number().default(5),
    targetStyle: z.string().default('engaging'),
    targetAudience: z.string().default('general')
  }),
  database: z.object({
    url: z.string().default('file:./mastra.db')
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info')
  })
});

// 默认RSS源
const DEFAULT_RSS_SOURCES = [
  {
    type: 'rss' as const,
    name: '新浪新闻',
    url: 'http://rss.sina.com.cn/news/china/focus15.xml',
    category: '国内新闻'
  },
  {
    type: 'rss' as const,
    name: '网易新闻', 
    url: 'http://news.163.com/special/00011K6L/rss_newstop.xml',
    category: '热点新闻'
  },
  {
    type: 'rss' as const,
    name: '腾讯科技',
    url: 'https://news.qq.com/newsgn/rss_newsgn.xml',
    category: '科技新闻'
  }
];

// 加载配置
function loadConfig() {
  try {
    // 确保环境变量已加载
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      try {
        // 尝试加载 dotenv (同步方式)
        require('dotenv').config();
      } catch (error) {
        // dotenv 不是必需的，忽略错误
        console.warn('dotenv加载失败，请确保环境变量已正确设置');
      }
    }

    // 解析RSS源配置
    let rssSources = DEFAULT_RSS_SOURCES;
    if (process.env.RSS_SOURCES) {
      try {
        rssSources = JSON.parse(process.env.RSS_SOURCES);
      } catch (error) {
        console.warn('RSS_SOURCES环境变量解析失败，使用默认配置:', error);
      }
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim() || '';
    console.log('加载的API密钥长度:', apiKey.length); // 调试信息

    const config = {
      openai: {
        apiKey
      },
      news: {
        apiKey: process.env.NEWS_API_KEY,
        sources: rssSources,
        defaultLimit: parseInt(process.env.DEFAULT_ARTICLE_LIMIT || '10'),
        defaultHoursBack: parseInt(process.env.DEFAULT_HOURS_BACK || '24'),
        minQualityScore: parseInt(process.env.MIN_QUALITY_SCORE || '6'),
        maxArticles: parseInt(process.env.MAX_ARTICLES || '5'),
        targetStyle: process.env.TARGET_STYLE || 'engaging',
        targetAudience: process.env.TARGET_AUDIENCE || 'general'
      },
      database: {
        url: process.env.DATABASE_URL || 'file:./mastra.db'
      },
      logging: {
        level: (process.env.LOG_LEVEL as any) || 'info'
      }
    };

    return configSchema.parse(config);
  } catch (error) {
    console.error('配置加载失败:', error);
    throw new Error(`配置验证失败: ${error}`);
  }
}

// 导出配置
export const config = loadConfig();

// 导出类型
export type Config = z.infer<typeof configSchema>;
export type NewsSource = z.infer<typeof newsSourceSchema>;

// 配置验证函数
export function validateConfig(): boolean {
  try {
    configSchema.parse(config);
    return true;
  } catch (error) {
    console.error('配置验证失败:', error);
    return false;
  }
}

// 获取新闻源配置
export function getNewsSourcesConfig(): NewsSource[] {
  return config.news.sources;
}

// 获取处理配置
export function getProcessingConfig() {
  return {
    limit: config.news.defaultLimit,
    hoursBack: config.news.defaultHoursBack,
    minQualityScore: config.news.minQualityScore,
    maxArticles: config.news.maxArticles,
    targetStyle: config.news.targetStyle,
    targetAudience: config.news.targetAudience
  };
}
