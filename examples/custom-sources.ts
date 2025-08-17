/**
 * 自定义新闻源示例
 * 演示如何使用自定义的新闻源配置
 */

// 确保环境变量已加载
import 'dotenv/config';

import { mastra } from '../src/mastra';
import { config } from '../src/config';

async function customSourcesExample() {
  console.log('🔧 自定义新闻源示例...');

  try {
    // 自定义新闻源配置
    const customSources = [
      {
        type: 'rss' as const,
        name: '人民网',
        url: 'http://www.people.com.cn/rss/politics.xml',
        category: '政治新闻'
      },
      {
        type: 'rss' as const,
        name: '央视新闻',
        url: 'http://news.cctv.com/rss/china.xml',
        category: '央视新闻'
      },
      {
        type: 'api' as const,
        name: 'NewsAPI科技',
        url: 'https://newsapi.org/v2/top-headlines',
        category: '科技新闻',
        apiKey: config.news.apiKey // 如果有API密钥
      }
    ];

    console.log(`📰 使用 ${customSources.length} 个自定义新闻源`);

    // 执行工作流
    const workflow = mastra.getWorkflow('newsProcessingWorkflow');
    const run = await workflow.createRunAsync();

    const result = await run.start({
      inputData: {
        sources: customSources,
        limit: 5,
        hoursBack: 12, // 只获取12小时内的新闻
        minQualityScore: 7, // 提高质量要求
        maxArticles: 3, // 只要最好的3篇
        targetStyle: 'professional', // 专业风格
        targetAudience: 'business' // 商务受众
      }
    });

    console.log('\n✅ 自定义源处理完成!');

    if (result.status === 'success') {
      const workflowResult = result.result;
      console.log(`📊 结果: ${workflowResult.summary.totalProcessed}篇文章, 平均质量${workflowResult.summary.averageQuality}分`);

      // 按质量排序显示
      const sortedArticles = workflowResult.processedArticles.sort((a: any, b: any) => b.wordCount - a.wordCount);

      console.log('\n🏆 处理结果 (按字数排序):');
      sortedArticles.forEach((article: any, index: number) => {
        console.log(`\n${index + 1}. ${article.title}`);
        console.log(`   📝 ${article.wordCount}字 | ⏱️ ${article.estimatedReadTime}分钟`);
        console.log(`   🏷️ ${article.category} | 📅 ${new Date(article.publishDate).toLocaleString()}`);
        console.log(`   📄 ${article.summary.substring(0, 100)}...`);
      });

      return workflowResult.processedArticles;
    } else {
      console.error('工作流执行失败:', result);
      throw new Error(`工作流执行失败: ${result.status}`);
    }
  } catch (error) {
    console.error('❌ 自定义源处理失败:', error);
    throw error;
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  customSourcesExample()
    .then(() => {
      console.log('\n🎉 自定义源示例完成!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 自定义源示例失败:', error);
      process.exit(1);
    });
}

export { customSourcesExample };
