
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { newsProcessingWorkflow } from './workflows/news-processing-workflow';
import { contentQAWorkflow } from './workflows/content-qa-workflow';
import { contentProcessorAgent, contentAnalyzerAgent, contentRewriterAgent } from './agents/content-processor-agent';
import { frontendCodeReviewAgent } from './agents/frontend-code-review-agent';
import { contentQAAgent } from './agents/content-qa-agent';

export const mastra = new Mastra({
  workflows: { newsProcessingWorkflow, contentQAWorkflow },
  agents: {
    contentProcessorAgent,
    contentAnalyzerAgent,
    contentRewriterAgent,
    frontendCodeReviewAgent,
    contentQAAgent
  },
  storage: new LibSQLStore({
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
