// 简单的配置测试脚本
import 'dotenv/config';

console.log('🔍 检查环境变量...');
console.log('OPENAI_API_KEY 长度:', process.env.OPENAI_API_KEY?.length || 0);
console.log('OPENAI_API_KEY 前10位:', process.env.OPENAI_API_KEY?.substring(0, 10) || 'undefined');

try {
  const { config } = await import('./src/config/index.js');
  console.log('✅ 配置加载成功!');
  console.log('OpenAI API Key 配置状态:', config.openai.apiKey ? '已配置' : '未配置');
  console.log('新闻源数量:', config.news.sources.length);
} catch (error) {
  console.error('❌ 配置加载失败:', error);
}
