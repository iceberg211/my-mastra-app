#!/usr/bin/env npx tsx

/**
 * 示例运行脚本
 * 提供交互式菜单来运行不同的示例
 */

import * as readline from 'readline';
import { basicExample } from '../examples/basic-usage';
import { customSourcesExample } from '../examples/custom-sources';
import { runAllTests } from '../examples/test-tools';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showMenu() {
  console.log('\n🤖 智能体资讯处理系统 - 示例菜单');
  console.log('=====================================');
  console.log('1. 基础使用示例 - 使用默认配置处理新闻');
  console.log('2. 自定义源示例 - 使用自定义新闻源');
  console.log('3. 工具测试 - 单独测试各个工具功能');
  console.log('4. 查看系统配置');
  console.log('5. 退出');
  console.log('=====================================');
}

function showConfig() {
  console.log('\n⚙️ 当前系统配置:');
  console.log('=====================================');
  console.log(`OpenAI API Key: ${process.env.OPENAI_API_KEY ? '已配置 ✅' : '未配置 ❌'}`);
  console.log(`News API Key: ${process.env.NEWS_API_KEY ? '已配置 ✅' : '未配置 ⚠️'}`);
  console.log(`默认文章限制: ${process.env.DEFAULT_ARTICLE_LIMIT || '10'}`);
  console.log(`最低质量分数: ${process.env.MIN_QUALITY_SCORE || '6'}`);
  console.log(`最大文章数: ${process.env.MAX_ARTICLES || '5'}`);
  console.log(`目标风格: ${process.env.TARGET_STYLE || 'engaging'}`);
  console.log(`目标受众: ${process.env.TARGET_AUDIENCE || 'general'}`);
  console.log('=====================================');
}

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function handleChoice(choice: string) {
  switch (choice) {
    case '1':
      console.log('\n🚀 运行基础使用示例...');
      try {
        await basicExample();
        console.log('\n✅ 基础示例完成!');
      } catch (error) {
        console.error('\n❌ 基础示例失败:', error);
      }
      break;

    case '2':
      console.log('\n🔧 运行自定义源示例...');
      try {
        await customSourcesExample();
        console.log('\n✅ 自定义源示例完成!');
      } catch (error) {
        console.error('\n❌ 自定义源示例失败:', error);
      }
      break;

    case '3':
      console.log('\n🧪 运行工具测试...');
      try {
        await runAllTests();
        console.log('\n✅ 工具测试完成!');
      } catch (error) {
        console.error('\n❌ 工具测试失败:', error);
      }
      break;

    case '4':
      showConfig();
      break;

    case '5':
      console.log('\n👋 再见!');
      rl.close();
      process.exit(0);
      break;

    default:
      console.log('\n❌ 无效选择，请输入 1-5');
      break;
  }
}

async function main() {
  console.log('🎉 欢迎使用智能体资讯处理系统!');
  
  // 检查基本配置
  if (!process.env.OPENAI_API_KEY) {
    console.log('\n⚠️ 警告: 未检测到 OPENAI_API_KEY 环境变量');
    console.log('请确保已正确配置 .env 文件');
    
    const continueAnyway = await askQuestion('\n是否继续运行? (y/N): ');
    if (continueAnyway.toLowerCase() !== 'y') {
      console.log('👋 退出程序');
      rl.close();
      process.exit(0);
    }
  }

  while (true) {
    showMenu();
    const choice = await askQuestion('\n请选择一个选项 (1-5): ');
    await handleChoice(choice);
    
    if (choice !== '4' && choice !== '5') {
      const continueChoice = await askQuestion('\n按 Enter 继续，或输入 q 退出: ');
      if (continueChoice.toLowerCase() === 'q') {
        console.log('\n👋 再见!');
        rl.close();
        process.exit(0);
      }
    }
  }
}

// 处理程序退出
process.on('SIGINT', () => {
  console.log('\n\n👋 程序被中断，再见!');
  rl.close();
  process.exit(0);
});

// 运行主程序
if (require.main === module) {
  main().catch((error) => {
    console.error('\n💥 程序运行出错:', error);
    rl.close();
    process.exit(1);
  });
}
