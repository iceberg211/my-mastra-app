import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// 微信公众号文章格式接口
interface WechatArticle {
  title: string;
  subtitle?: string;
  content: string;
  summary: string;
  tags: string[];
  category: string;
  estimatedReadTime: number;
  wordCount: number;
}

// Emoji映射表
const EMOJI_MAP = {
  // 新闻类型
  '科技': '🔬',
  '财经': '💰',
  '体育': '⚽',
  '娱乐': '🎭',
  '政治': '🏛️',
  '社会': '👥',
  '国际': '🌍',
  '军事': '⚔️',
  '教育': '📚',
  '健康': '🏥',
  '环境': '🌱',
  '汽车': '🚗',
  
  // 情感类型
  '积极': '✨',
  '中性': '📰',
  '关注': '⚠️',
  '重要': '🔥',
  '突发': '🚨',
  '深度': '🔍',
  
  // 行动类型
  '分析': '📊',
  '解读': '💡',
  '观点': '💭',
  '预测': '🔮',
  '回顾': '📅',
  '前瞻': '🚀'
};

// 标题优化工具
export const titleOptimizerTool = createTool({
  id: 'optimize-title',
  description: '优化文章标题，使其更适合微信公众号传播',
  inputSchema: z.object({
    originalTitle: z.string().describe('原始标题'),
    content: z.string().describe('文章内容'),
    category: z.string().optional().describe('文章分类'),
    targetAudience: z.string().default('general').describe('目标受众'),
    style: z.enum(['professional', 'casual', 'engaging', 'news']).default('engaging').describe('标题风格')
  }),
  outputSchema: z.object({
    optimizedTitle: z.string(),
    subtitle: z.string().optional(),
    alternatives: z.array(z.string()),
    reasoning: z.string()
  }),
  execute: async ({ context }) => {
    const { originalTitle, content, category, targetAudience, style } = context;
    
    // 提取关键词
    const keywords = extractKeywords(content);
    
    // 生成优化标题
    const optimizedTitle = generateOptimizedTitle(originalTitle, keywords, category, style);
    
    // 生成副标题
    const subtitle = generateSubtitle(content, keywords);
    
    // 生成备选标题
    const alternatives = generateAlternativeTitles(originalTitle, keywords, category, style);
    
    return {
      optimizedTitle,
      subtitle,
      alternatives,
      reasoning: `基于原标题"${originalTitle}"，结合文章内容关键词${keywords.slice(0, 3).join('、')}，采用${style}风格进行优化，使标题更具吸引力和传播性。`
    };
  }
});

// 内容格式化工具
export const contentFormatterTool = createTool({
  id: 'format-content',
  description: '将内容格式化为微信公众号文章格式',
  inputSchema: z.object({
    title: z.string().describe('文章标题'),
    content: z.string().describe('文章内容'),
    category: z.string().optional().describe('文章分类'),
    addEmojis: z.boolean().default(true).describe('是否添加emoji'),
    addFormatting: z.boolean().default(true).describe('是否添加格式化'),
    maxParagraphLength: z.number().default(200).describe('段落最大长度')
  }),
  outputSchema: z.object({
    formattedContent: z.string(),
    summary: z.string(),
    tags: z.array(z.string()),
    estimatedReadTime: z.number(),
    wordCount: z.number()
  }),
  execute: async ({ context }) => {
    const { title, content, category, addEmojis, addFormatting, maxParagraphLength } = context;
    
    // 分段处理
    let formattedContent = formatParagraphs(content, maxParagraphLength);
    
    // 添加格式化
    if (addFormatting) {
      formattedContent = addTextFormatting(formattedContent);
    }
    
    // 添加emoji
    if (addEmojis) {
      formattedContent = addEmojis ? addEmojiToContent(formattedContent, category) : formattedContent;
    }
    
    // 生成摘要
    const summary = generateSummary(content);
    
    // 提取标签
    const tags = extractTags(title, content, category);
    
    // 计算阅读时间（按每分钟200字计算）
    const wordCount = content.length;
    const estimatedReadTime = Math.ceil(wordCount / 200);
    
    return {
      formattedContent,
      summary,
      tags,
      estimatedReadTime,
      wordCount
    };
  }
});

// 完整文章生成工具
export const articleGeneratorTool = createTool({
  id: 'generate-wechat-article',
  description: '生成完整的微信公众号文章',
  inputSchema: z.object({
    title: z.string().describe('文章标题'),
    content: z.string().describe('文章内容'),
    category: z.string().optional().describe('文章分类'),
    author: z.string().optional().describe('作者'),
    source: z.string().optional().describe('来源'),
    publishDate: z.string().optional().describe('发布日期')
  }),
  outputSchema: z.object({
    article: z.object({
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
    }),
    metadata: z.object({
      seoTitle: z.string(),
      seoDescription: z.string(),
      keywords: z.array(z.string())
    })
  }),
  execute: async ({ context }) => {
    const { title, content, category = '资讯', author, source, publishDate } = context;
    
    // 优化标题
    const titleResult = await titleOptimizerTool.execute({
      context: {
        originalTitle: title,
        content,
        category,
        targetAudience: 'general',
        style: 'engaging'
      }
    });
    
    // 格式化内容
    const formatResult = await contentFormatterTool.execute({
      context: {
        title: titleResult.optimizedTitle,
        content,
        category,
        addEmojis: true,
        addFormatting: true,
        maxParagraphLength: 200
      }
    });
    
    // 生成SEO元数据
    const seoTitle = generateSEOTitle(titleResult.optimizedTitle);
    const seoDescription = formatResult.summary.length > 120 
      ? formatResult.summary.substring(0, 120) + '...' 
      : formatResult.summary;
    const keywords = extractKeywords(content).slice(0, 10);
    
    const article: WechatArticle = {
      title: titleResult.optimizedTitle,
      subtitle: titleResult.subtitle,
      content: formatResult.formattedContent,
      summary: formatResult.summary,
      tags: formatResult.tags,
      category,
      estimatedReadTime: formatResult.estimatedReadTime,
      wordCount: formatResult.wordCount
    };
    
    return {
      article: {
        ...article,
        author,
        source,
        publishDate: publishDate || new Date().toISOString()
      },
      metadata: {
        seoTitle,
        seoDescription,
        keywords
      }
    };
  }
});

// 辅助函数
function extractKeywords(content: string): string[] {
  // 简单的关键词提取（实际项目中可以使用更复杂的NLP算法）
  const words = content.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  const wordCount = new Map<string, number>();
  
  words.forEach(word => {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  });
  
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

function generateOptimizedTitle(original: string, keywords: string[], category?: string, style: string = 'engaging'): string {
  const emoji = category ? EMOJI_MAP[category] || EMOJI_MAP['中性'] : EMOJI_MAP['中性'];
  
  // 根据风格调整标题
  switch (style) {
    case 'professional':
      return `${emoji} ${original}`;
    case 'casual':
      return `${emoji} ${original}，你怎么看？`;
    case 'engaging':
      return `${emoji} ${original}！`;
    case 'news':
      return `【${category || '资讯'}】${original}`;
    default:
      return `${emoji} ${original}`;
  }
}

function generateSubtitle(content: string, keywords: string[]): string | undefined {
  const firstSentence = content.split(/[。！？]/)[0];
  if (firstSentence && firstSentence.length > 10 && firstSentence.length < 50) {
    return firstSentence + '。';
  }
  return undefined;
}

function generateAlternativeTitles(original: string, keywords: string[], category?: string, style: string = 'engaging'): string[] {
  const alternatives = [];
  const emoji = category ? EMOJI_MAP[category] || EMOJI_MAP['中性'] : EMOJI_MAP['中性'];
  
  alternatives.push(`${emoji} 重磅！${original}`);
  alternatives.push(`${emoji} 最新：${original}`);
  alternatives.push(`${emoji} 关注：${original}`);
  
  if (keywords.length > 0) {
    alternatives.push(`${emoji} ${keywords[0]}相关：${original}`);
  }
  
  return alternatives.slice(0, 3);
}

function formatParagraphs(content: string, maxLength: number): string {
  const sentences = content.split(/[。！？]/);
  const paragraphs = [];
  let currentParagraph = '';
  
  for (const sentence of sentences) {
    if (sentence.trim()) {
      if (currentParagraph.length + sentence.length > maxLength && currentParagraph) {
        paragraphs.push(currentParagraph.trim() + '。');
        currentParagraph = sentence;
      } else {
        currentParagraph += sentence + '。';
      }
    }
  }
  
  if (currentParagraph.trim()) {
    paragraphs.push(currentParagraph.trim());
  }
  
  return paragraphs.join('\n\n');
}

function addTextFormatting(content: string): string {
  // 添加简单的文本格式化
  return content
    .replace(/(\d+%)/g, '**$1**')  // 百分比加粗
    .replace(/(\d+万|\d+亿|\d+千)/g, '**$1**')  // 数字加粗
    .replace(/(第一|首次|最新|重要|关键)/g, '**$1**');  // 重要词汇加粗
}

function addEmojiToContent(content: string, category?: string): string {
  const categoryEmoji = category ? EMOJI_MAP[category] : '';
  
  return content
    .replace(/^(.+)$/gm, (match, p1) => {
      if (p1.includes('重要') || p1.includes('关键')) {
        return `${EMOJI_MAP['重要']} ${p1}`;
      }
      if (p1.includes('分析') || p1.includes('数据')) {
        return `${EMOJI_MAP['分析']} ${p1}`;
      }
      return p1;
    });
}

function generateSummary(content: string): string {
  const sentences = content.split(/[。！？]/).filter(s => s.trim().length > 10);
  return sentences.slice(0, 2).join('。') + '。';
}

function extractTags(title: string, content: string, category?: string): string[] {
  const tags = [];
  
  if (category) tags.push(category);
  
  // 从标题和内容中提取标签
  const keywords = extractKeywords(title + content);
  tags.push(...keywords.slice(0, 5));
  
  return [...new Set(tags)].slice(0, 8);
}

function generateSEOTitle(title: string): string {
  return title.length > 60 ? title.substring(0, 57) + '...' : title;
}
