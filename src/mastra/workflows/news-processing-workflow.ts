import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { rssFetcherTool, newsApiFetcherTool, webScraperTool } from '../tools/news-fetcher-tool';
import { titleOptimizerTool, contentFormatterTool, articleGeneratorTool } from '../tools/format-converter-tool';

// 新闻文章数据结构
const newsArticleSchema = z.object({
  title: z.string(),
  content: z.string(),
  summary: z.string(),
  url: z.string(),
  publishedAt: z.string(),
  source: z.string(),
  author: z.string().optional(),
  category: z.string().optional()
});

const processedArticleSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  content: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
  category: z.string(),
  estimatedReadTime: z.number(),
  wordCount: z.number(),
  author: z.string().optional(),
  source: z.string().optional(),
  publishDate: z.string()
});

// 步骤1: 获取新闻资讯
const fetchNewsStep = createStep({
  id: 'fetch-news',
  description: '从多个数据源获取最新新闻资讯',
  inputSchema: z.object({
    sources: z.array(z.object({
      type: z.enum(['rss', 'api', 'web']),
      name: z.string(),
      url: z.string(),
      category: z.string().optional(),
      apiKey: z.string().optional()
    })).describe('新闻源配置'),
    limit: z.number().default(10).describe('每个源获取的文章数量'),
    hoursBack: z.number().default(24).describe('获取多少小时内的文章')
  }),
  outputSchema: z.object({
    articles: z.array(newsArticleSchema),
    totalCount: z.number(),
    sources: z.array(z.string())
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('输入数据不能为空');
    }

    const { sources, limit, hoursBack } = inputData;
    const allArticles: any[] = [];
    const processedSources: string[] = [];

    for (const source of sources) {
      try {
        let result;
        
        switch (source.type) {
          case 'rss':
            result = await rssFetcherTool.execute({
              context: {
                sources: [{ name: source.name, url: source.url, category: source.category }],
                limit,
                hoursBack
              }
            });
            allArticles.push(...result.articles);
            processedSources.push(...result.sources);
            break;
            
          case 'api':
            if (!source.apiKey) {
              console.warn(`跳过API源 ${source.name}: 缺少API密钥`);
              continue;
            }
            result = await newsApiFetcherTool.execute({
              context: {
                apiKey: source.apiKey,
                category: source.category,
                pageSize: limit
              }
            });
            allArticles.push(...result.articles);
            processedSources.push(source.name);
            break;
            
          case 'web':
            result = await webScraperTool.execute({
              context: {
                url: source.url
              }
            });
            allArticles.push(result);
            processedSources.push(source.name);
            break;
        }
      } catch (error) {
        console.error(`获取 ${source.name} 失败:`, error);
      }
    }

    // 去重处理（基于标题相似度）
    const uniqueArticles = removeDuplicateArticles(allArticles);
    
    // 按发布时间排序
    uniqueArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return {
      articles: uniqueArticles,
      totalCount: uniqueArticles.length,
      sources: [...new Set(processedSources)]
    };
  }
});

// 步骤2: 内容分析和筛选
const analyzeContentStep = createStep({
  id: 'analyze-content',
  description: '使用AI分析文章质量和相关性',
  inputSchema: z.object({
    articles: z.array(newsArticleSchema),
    minQualityScore: z.number().default(6).describe('最低质量分数(1-10)'),
    maxArticles: z.number().default(5).describe('最多保留文章数量')
  }),
  outputSchema: z.object({
    selectedArticles: z.array(newsArticleSchema.extend({
      qualityScore: z.number(),
      analysisReason: z.string()
    })),
    rejectedCount: z.number()
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error('输入数据不能为空');
    }

    const { articles, minQualityScore, maxArticles } = inputData;
    const analyzer = mastra?.getAgent('contentAnalyzerAgent');
    
    if (!analyzer) {
      // 如果没有分析器，使用简单的筛选逻辑
      const selectedArticles = articles
        .filter(article => article.content.length > 100 && article.title.length > 10)
        .slice(0, maxArticles)
        .map(article => ({
          ...article,
          qualityScore: 7,
          analysisReason: '基于基础规则筛选'
        }));
        
      return {
        selectedArticles,
        rejectedCount: articles.length - selectedArticles.length
      };
    }

    const selectedArticles = [];
    let rejectedCount = 0;

    for (const article of articles.slice(0, maxArticles * 2)) { // 分析更多文章以便筛选
      try {
        const analysisPrompt = `请分析以下新闻文章的质量和价值，给出1-10分的评分：

标题: ${article.title}
内容: ${article.content.substring(0, 500)}...
来源: ${article.source}

请从以下维度评估：
1. 新闻价值和时效性
2. 内容质量和完整性
3. 可读性和吸引力
4. 传播价值

返回JSON格式：{"score": 数字, "reason": "评分理由"}`;

        const response = await analyzer.stream([{
          role: 'user',
          content: analysisPrompt
        }]);

        let analysisText = '';
        for await (const chunk of response.textStream) {
          analysisText += chunk;
        }

        // 尝试解析JSON响应
        let analysis;
        try {
          const jsonMatch = analysisText.match(/\{[^}]*\}/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[0]);
          } else {
            analysis = { score: 6, reason: '无法解析分析结果' };
          }
        } catch {
          analysis = { score: 6, reason: '分析结果解析失败' };
        }

        if (analysis.score >= minQualityScore && selectedArticles.length < maxArticles) {
          selectedArticles.push({
            ...article,
            qualityScore: analysis.score,
            analysisReason: analysis.reason
          });
        } else {
          rejectedCount++;
        }
      } catch (error) {
        console.error('文章分析失败:', error);
        rejectedCount++;
      }
    }

    return {
      selectedArticles,
      rejectedCount: rejectedCount + (articles.length - maxArticles * 2)
    };
  }
});

// 步骤3: 内容重写和优化
const rewriteContentStep = createStep({
  id: 'rewrite-content',
  description: '使用AI重写和优化文章内容',
  inputSchema: z.object({
    selectedArticles: z.array(newsArticleSchema.extend({
      qualityScore: z.number(),
      analysisReason: z.string()
    })),
    targetStyle: z.string().default('engaging').describe('目标写作风格'),
    targetAudience: z.string().default('general').describe('目标受众')
  }),
  outputSchema: z.object({
    rewrittenArticles: z.array(z.object({
      original: newsArticleSchema,
      rewritten: z.object({
        title: z.string(),
        content: z.string(),
        summary: z.string()
      }),
      qualityScore: z.number()
    }))
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error('输入数据不能为空');
    }

    const { selectedArticles, targetStyle, targetAudience } = inputData;
    const rewriter = mastra?.getAgent('contentRewriterAgent');
    const rewrittenArticles = [];

    for (const article of selectedArticles) {
      try {
        if (!rewriter) {
          // 如果没有重写器，保持原内容
          rewrittenArticles.push({
            original: article,
            rewritten: {
              title: article.title,
              content: article.content,
              summary: article.summary
            },
            qualityScore: article.qualityScore
          });
          continue;
        }

        const rewritePrompt = `请将以下新闻文章重写为更适合${targetAudience}受众的${targetStyle}风格内容：

原标题: ${article.title}
原内容: ${article.content}

要求：
1. 保持核心事实准确性
2. 使用更生动有趣的语言
3. 优化段落结构
4. 生成吸引人的标题
5. 创建简洁的摘要

返回JSON格式：
{
  "title": "重写后的标题",
  "content": "重写后的内容",
  "summary": "重写后的摘要"
}`;

        const response = await rewriter.stream([{
          role: 'user',
          content: rewritePrompt
        }]);

        let rewriteText = '';
        for await (const chunk of response.textStream) {
          rewriteText += chunk;
        }

        // 解析重写结果
        let rewritten;
        try {
          const jsonMatch = rewriteText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            rewritten = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('无法找到JSON格式的响应');
          }
        } catch {
          rewritten = {
            title: article.title,
            content: article.content,
            summary: article.summary
          };
        }

        rewrittenArticles.push({
          original: article,
          rewritten,
          qualityScore: article.qualityScore
        });

      } catch (error) {
        console.error('文章重写失败:', error);
        // 保持原文章
        rewrittenArticles.push({
          original: article,
          rewritten: {
            title: article.title,
            content: article.content,
            summary: article.summary
          },
          qualityScore: article.qualityScore
        });
      }
    }

    return { rewrittenArticles };
  }
});

// 步骤4: 格式转换和最终输出
const formatOutputStep = createStep({
  id: 'format-output',
  description: '将文章转换为最终发布格式',
  inputSchema: z.object({
    rewrittenArticles: z.array(z.object({
      original: newsArticleSchema,
      rewritten: z.object({
        title: z.string(),
        content: z.string(),
        summary: z.string()
      }),
      qualityScore: z.number()
    }))
  }),
  outputSchema: z.object({
    processedArticles: z.array(processedArticleSchema),
    summary: z.object({
      totalProcessed: z.number(),
      averageQuality: z.number(),
      categories: z.array(z.string())
    })
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('输入数据不能为空');
    }

    const { rewrittenArticles } = inputData;
    const processedArticles = [];

    for (const item of rewrittenArticles) {
      try {
        const result = await articleGeneratorTool.execute({
          context: {
            title: item.rewritten.title,
            content: item.rewritten.content,
            category: item.original.category || '资讯',
            author: item.original.author,
            source: item.original.source,
            publishDate: item.original.publishedAt
          }
        });

        processedArticles.push(result.article);
      } catch (error) {
        console.error('文章格式化失败:', error);
      }
    }

    // 计算统计信息
    const totalProcessed = processedArticles.length;
    const averageQuality = rewrittenArticles.reduce((sum, item) => sum + item.qualityScore, 0) / rewrittenArticles.length;
    const categories = [...new Set(processedArticles.map(article => article.category))];

    return {
      processedArticles,
      summary: {
        totalProcessed,
        averageQuality: Math.round(averageQuality * 10) / 10,
        categories
      }
    };
  }
});

// 创建完整的新闻处理工作流
export const newsProcessingWorkflow = createWorkflow({
  id: 'news-processing-workflow',
  inputSchema: z.object({
    sources: z.array(z.object({
      type: z.enum(['rss', 'api', 'web']),
      name: z.string(),
      url: z.string(),
      category: z.string().optional(),
      apiKey: z.string().optional()
    })).describe('新闻源配置'),
    limit: z.number().default(10).describe('每个源获取的文章数量'),
    hoursBack: z.number().default(24).describe('获取多少小时内的文章'),
    minQualityScore: z.number().default(6).describe('最低质量分数'),
    maxArticles: z.number().default(5).describe('最多处理文章数量'),
    targetStyle: z.string().default('engaging').describe('目标写作风格'),
    targetAudience: z.string().default('general').describe('目标受众')
  }),
  outputSchema: z.object({
    processedArticles: z.array(processedArticleSchema),
    summary: z.object({
      totalProcessed: z.number(),
      averageQuality: z.number(),
      categories: z.array(z.string())
    })
  })
})
  .then(fetchNewsStep)
  .then(analyzeContentStep)
  .then(rewriteContentStep)
  .then(formatOutputStep);

// 提交工作流
newsProcessingWorkflow.commit();

// 辅助函数：去重
function removeDuplicateArticles(articles: any[]): any[] {
  const seen = new Set();
  return articles.filter(article => {
    const key = article.title.toLowerCase().replace(/\s+/g, '');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
