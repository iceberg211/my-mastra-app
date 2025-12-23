import { mastra } from '../src/mastra/index';

/**
 * Content QA Agent 测试示例
 * 
 * 测试商品详情内容审查功能
 */

// 模拟商品详情数据（包含一些故意的错误用于测试）
const samplePackageDetail = {
    name: '智能蓝牙耳机 Pro 版',
    description: `
    这款智能蓝牙耳机采用先进的降噪技术，让您在嘈杂环境中也能享受纯净音质。
    耳机拥有长达 20 小时的续航时间，配合充电仓可以达到约 60 小时左右的总续航。
    支持蓝牙 5.0 协义，连接更稳定，传输速度更快。
    
    采用人体工学设计，佩带舒适，长时间使用也不会感到疲劳。
    IPX5 级防水，运动出汗也不怕。
    
    注意：本产品不防水，请勿在水中使用。
  `,
    specifications: {
        '蓝牙版本': '蓝牙 5.0',
        '续航时间': '20小时（耳机）/ 60小时（含充电仓）',
        '充电时间': '约 1.5 小时',
        '防水等级': 'IPX5',
        '重量': '约 5g（单耳）',
        '驱动单元': '10mm 动圈',
        '频率响应': '20Hz - 20KHz',
    },
    price: '￥299',
    originalPrice: '￥399',
    category: '数码配件',
    tags: ['蓝牙耳机', '降噪', '运动耳机', '长续航'],
    features: [
        '主动降噪技术',
        '20小时超长续航',
        '蓝牙5.0快速连接',
        'IPX5级防水',
        '人体工学设计',
    ],
};

async function testContentQA() {
    console.log('====================================');
    console.log('Content QA Agent 测试');
    console.log('====================================\n');

    console.log('输入的商品详情：');
    console.log(JSON.stringify(samplePackageDetail, null, 2));
    console.log('\n' + '='.repeat(50) + '\n');

    try {
        // 获取 Content QA Agent
        const agent = mastra.getAgent('contentQAAgent');

        if (!agent) {
            throw new Error('Content QA Agent 未找到');
        }

        console.log('正在审查内容...\n');

        // 构建审查请求
        const reviewPrompt = `请审查以下商品详情内容，按照你的职责输出完整的 JSON 格式审查报告：

\`\`\`json
${JSON.stringify(samplePackageDetail, null, 2)}
\`\`\`

请仔细分析并输出审查报告。`;

        const response = await agent.stream([{
            role: 'user',
            content: reviewPrompt,
        }]);

        let responseText = '';
        process.stdout.write('AI 响应：');
        for await (const chunk of response.textStream) {
            process.stdout.write(chunk);
            responseText += chunk;
        }
        console.log('\n');

        // 尝试解析 JSON
        console.log('='.repeat(50));
        console.log('解析审查报告...\n');

        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
            responseText.match(/(\{[\s\S]*\})/);

        if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            try {
                const report = JSON.parse(jsonStr);

                console.log('📋 审查报告摘要：');
                console.log(`  商品名称：${report.summary?.productName}`);
                console.log(`  质量评分：${report.summary?.overallQualityScore}/10`);
                console.log(`  整体评价：${report.summary?.briefAssessment}`);

                console.log('\n⚠️  发现问题：');
                if (report.issues && report.issues.length > 0) {
                    report.issues.forEach((issue: any, index: number) => {
                        console.log(`\n  ${index + 1}. [${issue.severity}] ${issue.type}`);
                        console.log(`     位置：${issue.location}`);
                        console.log(`     问题：${issue.description}`);
                        console.log(`     建议：${issue.suggestion}`);
                    });
                } else {
                    console.log('  未发现明显问题');
                }

                console.log('\n📊 统计信息：');
                console.log(`  总问题数：${report.statistics?.totalIssues || 0}`);
                console.log(`  高严重度：${report.statistics?.highSeverity || 0}`);
                console.log(`  中严重度：${report.statistics?.mediumSeverity || 0}`);
                console.log(`  低严重度：${report.statistics?.lowSeverity || 0}`);

                if (report.recommendations && report.recommendations.length > 0) {
                    console.log('\n💡 改进建议：');
                    report.recommendations.forEach((rec: string, index: number) => {
                        console.log(`  ${index + 1}. ${rec}`);
                    });
                }

            } catch (parseError) {
                console.error('JSON 解析失败:', parseError);
                console.log('原始响应已在上方显示');
            }
        } else {
            console.log('未能从响应中提取 JSON 格式的报告');
        }

    } catch (error) {
        console.error('测试失败:', error);
    }
}

// 运行测试
testContentQA().catch(console.error);
