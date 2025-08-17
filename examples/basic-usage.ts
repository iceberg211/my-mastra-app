/**
 * 基础使用示例
 * 演示如何使用新闻处理工作流获取和处理资讯
 */

import { mastra } from '../src/mastra';
import { config, getNewsSourcesConfig, getProcessingConfig } from '../src/config';

async function basicExample() {
  console.log('🚀 开始新闻处理示例...');
  
  try {
    // 验证配置
    if (!config.openai.apiKey) {
      throw new Error('请设置OPENAI_API_KEY环境变量');
    }

    // 获取配置
    const sources = getNewsSourcesConfig();
    const processingConfig = getProcessingConfig();

    console.log(`📰 配置了 ${sources.length} 个新闻源`);
    console.log(`⚙️ 处理配置: 最多${processingConfig.maxArticles}篇文章, 质量分数≥${processingConfig.minQualityScore}`);

    // 执行新闻处理工作流
    const result = await mastra.runWorkflow('newsProcessingWorkflow', {
      sources,
      limit: processingConfig.limit,
      hoursBack: processingConfig.hoursBack,
      minQualityScore: processingConfig.minQualityScore,
      maxArticles: processingConfig.maxArticles,
      targetStyle: processingConfig.targetStyle,
      targetAudience: processingConfig.targetAudience
    });

    console.log('\n✅ 处理完成!');
    console.log(`📊 统计信息:`);
    console.log(`   - 处理文章数: ${result.summary.totalProcessed}`);
    console.log(`   - 平均质量分: ${result.summary.averageQuality}`);
    console.log(`   - 涉及分类: ${result.summary.categories.join(', ')}`);

    // 显示处理后的文章
    console.log('\n📝 处理后的文章:');
    result.processedArticles.forEach((article, index) => {
      console.log(`\n${index + 1}. ${article.title}`);
      console.log(`   分类: ${article.category}`);
      console.log(`   字数: ${article.wordCount}`);
      console.log(`   预计阅读时间: ${article.estimatedReadTime}分钟`);
      console.log(`   标签: ${article.tags.join(', ')}`);
      console.log(`   摘要: ${article.summary}`);
      console.log(`   来源: ${article.source}`);
    });

    return result;
  } catch (error) {
    console.error('❌ 处理失败:', error);
    throw error;
  }
}

// 如果直接运行此文件
if (require.main === module) {
  basicExample()
    .then(() => {
      console.log('\n🎉 示例执行完成!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 示例执行失败:', error);
      process.exit(1);
    });
}

export { basicExample };
