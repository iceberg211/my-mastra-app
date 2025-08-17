/**
 * 工具测试示例
 * 单独测试各个工具的功能
 */

// 确保环境变量已加载
import 'dotenv/config';

import { rssFetcherTool, newsApiFetcherTool } from '../src/mastra/tools/news-fetcher-tool';
import { titleOptimizerTool, contentFormatterTool } from '../src/mastra/tools/format-converter-tool';
import { config } from '../src/config';

async function testRSSFetcher() {
  console.log('🧪 测试RSS获取工具...');
  
  try {
    const result = await rssFetcherTool.execute({
      context: {
        sources: [
          {
            name: '新浪新闻测试',
            url: 'http://rss.sina.com.cn/news/china/focus15.xml',
            category: '测试分类'
          }
        ],
        limit: 3,
        hoursBack: 48
      },
      runtimeContext: {}
    });

    console.log(`✅ RSS获取成功: ${result.totalCount}篇文章`);
    console.log(`📰 来源: ${result.sources.join(', ')}`);
    
    if (result.articles.length > 0) {
      console.log(`📝 示例文章: ${result.articles[0].title}`);
      console.log(`📄 摘要: ${result.articles[0].summary.substring(0, 100)}...`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ RSS获取失败:', error);
    throw error;
  }
}

async function testNewsAPI() {
  console.log('\n🧪 测试NewsAPI工具...');
  
  if (!config.news.apiKey) {
    console.log('⚠️ 跳过NewsAPI测试: 未配置API密钥');
    return null;
  }
  
  try {
    const result = await newsApiFetcherTool.execute({
      context: {
        apiKey: config.news.apiKey,
        category: 'technology',
        country: 'us',
        pageSize: 3
      }
    });

    console.log(`✅ NewsAPI获取成功: ${result.totalResults}篇文章`);
    
    if (result.articles.length > 0) {
      console.log(`📝 示例文章: ${result.articles[0].title}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ NewsAPI获取失败:', error);
    return null;
  }
}

async function testTitleOptimizer() {
  console.log('\n🧪 测试标题优化工具...');
  
  const testTitle = '科技公司发布新产品';
  const testContent = '某知名科技公司今日发布了一款革命性的新产品，该产品采用了最新的人工智能技术，预计将改变整个行业的发展方向。';
  
  try {
    const result = await titleOptimizerTool.execute({
      context: {
        originalTitle: testTitle,
        content: testContent,
        category: '科技',
        style: 'engaging'
      }
    });

    console.log(`✅ 标题优化成功`);
    console.log(`📝 原标题: ${testTitle}`);
    console.log(`✨ 优化后: ${result.optimizedTitle}`);
    if (result.subtitle) {
      console.log(`📄 副标题: ${result.subtitle}`);
    }
    console.log(`🔄 备选标题: ${result.alternatives.join(' | ')}`);
    
    return result;
  } catch (error) {
    console.error('❌ 标题优化失败:', error);
    throw error;
  }
}

async function testContentFormatter() {
  console.log('\n🧪 测试内容格式化工具...');
  
  const testTitle = '🔬 科技公司发布革命性新产品！';
  const testContent = `某知名科技公司今日发布了一款革命性的新产品。该产品采用了最新的人工智能技术，具有以下特点：

1. 智能化程度极高
2. 用户体验优秀  
3. 性能表现卓越

业内专家认为，这款产品将改变整个行业的发展方向，为用户带来前所未有的体验。公司CEO表示，这是公司多年研发的成果，代表了技术发展的新高度。`;

  try {
    const result = await contentFormatterTool.execute({
      context: {
        title: testTitle,
        content: testContent,
        category: '科技',
        addEmojis: true,
        addFormatting: true,
        maxParagraphLength: 150
      }
    });

    console.log(`✅ 内容格式化成功`);
    console.log(`📝 字数: ${result.wordCount}`);
    console.log(`⏱️ 预计阅读时间: ${result.estimatedReadTime}分钟`);
    console.log(`🏷️ 标签: ${result.tags.join(', ')}`);
    console.log(`📄 摘要: ${result.summary}`);
    console.log(`📰 格式化内容预览: ${result.formattedContent.substring(0, 200)}...`);
    
    return result;
  } catch (error) {
    console.error('❌ 内容格式化失败:', error);
    throw error;
  }
}

async function runAllTests() {
  console.log('🚀 开始工具测试...\n');
  
  try {
    // 测试RSS获取
    await testRSSFetcher();
    
    // 测试NewsAPI
    await testNewsAPI();
    
    // 测试标题优化
    await testTitleOptimizer();
    
    // 测试内容格式化
    await testContentFormatter();
    
    console.log('\n🎉 所有测试完成!');
    
  } catch (error) {
    console.error('\n💥 测试过程中出现错误:', error);
    throw error;
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('⚠️ 工具测试暂时跳过，请直接运行基础示例');
  console.log('运行: npm run example:basic');
  process.exit(0);
}

export { 
  testRSSFetcher, 
  testNewsAPI, 
  testTitleOptimizer, 
  testContentFormatter, 
  runAllTests 
};
