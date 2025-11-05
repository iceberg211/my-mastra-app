// 示例脚本：运行 TA Setup 决策评分并打印 Markdown 报告
// 使用方式：
//   npx tsx scripts/run-ta-setup.ts            # 使用内置模拟数据
//   DATA_PATH=./candles.json npx tsx scripts/run-ta-setup.ts  # 从 JSON 读取 {frames:[{tf,candles:[OHLCV...]}]}

import fs from 'node:fs';
import path from 'node:path';
import { taSetupAgent, TASetupInput } from '../src/mastra/agents/ta-setup-agent';

type OHLCV = { t: number; o: number; h: number; l: number; c: number; v: number };

function genSyntheticCandles(n: number, start: number, stepSec: number, base = 100): OHLCV[] {
  const out: OHLCV[] = [];
  let px = base;
  for (let i = 0; i < n; i++) {
    const drift = (Math.random() - 0.5) * 0.6; // 轻微趋势
    const vol = 0.8 + Math.random() * 0.4;
    const o = px;
    const c = o + drift;
    const h = Math.max(o, c) + Math.random() * vol;
    const l = Math.min(o, c) - Math.random() * vol;
    const v = 100 + Math.random() * 50;
    out.push({ t: start + i * stepSec, o, h, l, c, v });
    px = c;
  }
  return out;
}

async function loadFramesFromJSON(p: string) {
  const full = path.resolve(p);
  const raw = fs.readFileSync(full, 'utf-8');
  const obj = JSON.parse(raw);
  if (!obj.frames) throw new Error('JSON 缺少 frames 字段');
  return obj.frames as Array<{ tf: string; candles: OHLCV[] }>;
}

async function main() {
  const dataPath = process.env.DATA_PATH;
  let frames: Array<{ tf: string; candles: OHLCV[] }>;
  if (dataPath) frames = await loadFramesFromJSON(dataPath);
  else {
    const now = Math.floor(Date.now() / 1000);
    frames = [
      { tf: '5m', candles: genSyntheticCandles(300, now - 300 * 300, 300) },
      { tf: '1h', candles: genSyntheticCandles(400, now - 400 * 3600, 3600) },
      { tf: '4h', candles: genSyntheticCandles(400, now - 400 * 14400, 14400) },
    ];
  }

  const input: TASetupInput = {
    symbol: process.env.SYMBOL || 'SYNTH/USD',
    frames,
    config: {},
  } as any;

  const result = await taSetupAgent(input);
  const md = [
    `# TA 决策报告 - ${input.symbol}`,
    `- 决策：${result.decision}`,
    `- Regime：${result.regime}`,
    `- 评分：${result.score}`,
    `- 分项：趋势=${result.breakdown.trend}，结构=${result.breakdown.structure}，波动=${result.breakdown.volatility}`,
    `## 多周期方向`,
    ...Object.entries(result.frameAlignment).map(([tf, d]) => `- ${tf}: ${d === 1 ? '多' : d === -1 ? '空' : '中性'}`),
    `## 证据`,
    ...result.evidence.map((e) => `- ${e}`),
  ].join('\n');

  console.log(md);
}

main().catch((err) => {
  console.error('运行失败:', err);
  process.exit(1);
});

