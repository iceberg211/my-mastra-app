import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

// 商品详情输入 Schema
const packageDetailSchema = z.object({
    name: z.string().describe('商品名称'),
    description: z.string().describe('商品描述'),
    specifications: z.record(z.string(), z.any()).optional().describe('规格参数'),
    price: z.string().optional().describe('价格'),
    originalPrice: z.string().optional().describe('原价'),
    category: z.string().optional().describe('商品类别'),
    tags: z.array(z.string()).optional().describe('标签'),
    features: z.array(z.string()).optional().describe('特性描述'),
    content: z.string().optional().describe('详情正文（纯文本或 HTML）'),
    rawData: z.any().optional().describe('原始数据（用于兜底）'),
});

// 问题项 Schema
const issueSchema = z.object({
    id: z.number(),
    type: z.enum(['错别字', '语法错误', '表达不清', '前后矛盾', '信息缺失']),
    severity: z.enum(['高', '中', '低']),
    location: z.string(),
    description: z.string(),
    suggestion: z.string(),
    correctedText: z.string(),
});

// 审查报告输出 Schema
const qaReportSchema = z.object({
    summary: z.object({
        productName: z.string(),
        category: z.string().optional(),
        keyFeatures: z.array(z.string()),
        targetAudience: z.string().optional(),
        overallQualityScore: z.number(),
        briefAssessment: z.string(),
    }),
    issues: z.array(issueSchema),
    statistics: z.object({
        totalIssues: z.number(),
        highSeverity: z.number(),
        mediumSeverity: z.number(),
        lowSeverity: z.number(),
    }),
    recommendations: z.array(z.string()),
});

// 内容审查步骤
const reviewContentStep = createStep({
    id: 'review-content',
    description: '使用 Content QA Agent 审查商品详情内容质量',
    inputSchema: z.object({
        packageDetail: packageDetailSchema,
    }),
    outputSchema: z.object({
        report: qaReportSchema,
        rawResponse: z.string().optional(),
    }),
    execute: async ({ inputData, mastra }) => {
        if (!inputData) {
            throw new Error('输入数据不能为空');
        }

        const { packageDetail } = inputData;
        const agent = mastra?.getAgent('contentQAAgent');

        if (!agent) {
            throw new Error('Content QA Agent 未注册');
        }

        // 构建审查请求
        const reviewPrompt = `请审查以下商品详情内容，按照你的职责输出完整的 JSON 格式审查报告：

\`\`\`json
${JSON.stringify(packageDetail, null, 2)}
\`\`\`

请仔细分析并输出审查报告。`;

        const response = await agent.stream([{
            role: 'user',
            content: reviewPrompt,
        }]);

        let responseText = '';
        for await (const chunk of response.textStream) {
            responseText += chunk;
        }

        // 解析 JSON 响应
        let report;
        try {
            // 尝试从响应中提取 JSON
            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                responseText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const jsonStr = jsonMatch[1] || jsonMatch[0];
                report = JSON.parse(jsonStr);
            } else {
                throw new Error('无法从响应中提取 JSON');
            }
        } catch (parseError) {
            console.error('JSON 解析失败:', parseError);
            // 返回基础报告
            report = {
                summary: {
                    productName: packageDetail.name || '未知商品',
                    category: packageDetail.category || '未分类',
                    keyFeatures: [],
                    overallQualityScore: 0,
                    briefAssessment: '审查报告解析失败，请查看原始响应',
                },
                issues: [],
                statistics: {
                    totalIssues: 0,
                    highSeverity: 0,
                    mediumSeverity: 0,
                    lowSeverity: 0,
                },
                recommendations: ['请手动检查原始响应内容'],
            };
        }

        return {
            report,
            rawResponse: responseText,
        };
    },
});

// 创建 Content QA Workflow
export const contentQAWorkflow = createWorkflow({
    id: 'content-qa-workflow',
    inputSchema: z.object({
        packageDetail: packageDetailSchema,
    }),
    outputSchema: z.object({
        report: qaReportSchema,
        rawResponse: z.string().optional(),
    }),
})
    .then(reviewContentStep);

// 提交工作流
contentQAWorkflow.commit();

// 导出 Schema 供外部使用
export { packageDetailSchema, qaReportSchema, issueSchema };
