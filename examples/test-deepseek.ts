import 'dotenv/config';
import { contentProcessorAgent } from '../src/mastra/agents/content-processor-agent';

async function testDeepSeekAgent() {
  console.log('🚀 测试 DeepSeek Content Processor Agent...');
  
  try {
    const testContent = `
    苹果公司今日发布了最新的iPhone 15系列手机，搭载了全新的A17 Pro芯片。
    新款手机在性能、摄影和电池续航方面都有显著提升。
    预计将于下月正式开售，起售价为999美元。
    `;

    console.log('📝 发送测试内容到 Content Processor Agent...');
    
    const response = await contentProcessorAgent.generate(
      `请分析并重写以下新闻内容，使其适合微信公众号发布：\n\n${testContent}`
    );

    console.log('✅ DeepSeek Agent 响应成功！');
    console.log('📄 处理结果：');
    console.log(response.text);
    
  } catch (error) {
    console.error('❌ 测试失败：', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        console.log('\n💡 提示：请确保在 .env 文件中设置了正确的 DEEPSEEK_API_KEY');
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        console.log('\n💡 提示：网络连接问题，DeepSeek API 可能无法访问');
      }
    }
  }
}

// 运行测试
testDeepSeekAgent();
