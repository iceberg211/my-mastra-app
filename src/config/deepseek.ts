import { createOpenAI } from '@ai-sdk/openai';

// DeepSeek 配置
export const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  compatibility: 'strict',
});

// 导出常用的模型名称
export const DEEPSEEK_MODELS = {
  CHAT: 'deepseek-chat',
  CODER: 'deepseek-coder',
} as const;
