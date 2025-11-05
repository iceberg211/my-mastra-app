// TA 形态/多周期结构评分 Agent
// - 聚合 HMA/KAMA/ATR/BB/RSI/Supertrend 指标，输出可解释的 Setup 评分
// - 仅专注“是否具备顺势入场的前置条件”，不负责下单执行

import { z } from 'zod';
import type { OHLCV } from '../tools/indicators-tool';
import { computeIndicators, lastValue } from '../tools/indicators-tool';

// =============
// 输入/输出定义
// =============

export const TASetupInput = z.object({
  symbol: z.string(),
  frames: z.array(
    z.object({
      tf: z.string(),
      candles: z.array(
        z.object({ t: z.number(), o: z.number(), h: z.number(), l: z.number(), c: z.number(), v: z.number() })
      ),
    })
  ),
  config: z
    .object({
      trend: z.object({ hmaLen: z.number().default(55), kamaLen: z.number().default(30) }).default({}),
      vol: z
        .object({ atrLen: z.number().default(14), bbLen: z.number().default(20), bbTightPct: z.number().default(0.12) })
        .default({}),
      structure: z.object({ pivotLeft: z.number().default(2), pivotRight: z.number().default(2) }).default({}),
      weights: z
        .object({ trend: z.number().default(0.5), structure: z.number().default(0.35), volatility: z.number().default(0.15) })
        .default({}),
      alignMin: z.number().default(0.67),
    })
    .default({}),
});
export type TASetupInput = z.infer<typeof TASetupInput>;

export type TASetupScore = {
  decision: 'long' | 'short' | 'neutral';
  regime: 'trend' | 'range' | 'volatile';
  score: number; // 0-100
  breakdown: { trend: number; structure: number; volatility: number };
  evidence: string[];
  frameAlignment: Record<string, 1 | -1 | 0>;
};

// =============
// 辅助函数
// =============

function sign(x: number): 1 | -1 | 0 {
  if (x > 0) return 1;
  if (x < 0) return -1;
  return 0;
}

function medianIgnoreNaN(arr: Float64Array): number {
  const v: number[] = [];
  for (let i = 0; i < arr.length; i++) if (!isNaN(arr[i])) v.push(arr[i]);
  if (v.length === 0) return NaN;
  v.sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 === 0 ? (v[mid - 1] + v[mid]) / 2 : v[mid];
}

function lastValid(arr: Float64Array): number | undefined {
  for (let i = arr.length - 1; i >= 0; i--) if (!isNaN(arr[i])) return arr[i];
  return undefined;
}

function lastValidIndex(arr: Float64Array): number {
  for (let i = arr.length - 1; i >= 0; i--) if (!isNaN(arr[i])) return i;
  return -1;
}

// 基础枢轴检测（对称窗口）
function findPivots(high: Float64Array, low: Float64Array, left = 2, right = 2) {
  const n = high.length;
  const ph: number[] = [];
  const pl: number[] = [];
  for (let i = left; i < n - right; i++) {
    let isHigh = true;
    let isLow = true;
    for (let k = i - left; k <= i + right; k++) {
      if (high[i] < high[k]) isHigh = false;
      if (low[i] > low[k]) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) ph.push(i);
    if (isLow) pl.push(i);
  }
  return { ph, pl };
}

// =============
// 主体逻辑
// =============

export async function taSetupAgent(input: TASetupInput): Promise<TASetupScore> {
  const parsed = TASetupInput.parse(input);
  const cfg = parsed.config;
  const frames = parsed.frames;

  const frameOpinions: Array<{
    tf: string;
    trendDir: 1 | -1 | 0;
    structDir: 1 | -1 | 0;
    regime: 'trend' | 'range' | 'volatile';
    regEase: number; // 0..1 越大越有利
    evidences: string[];
  }> = [];

  for (const f of frames) {
    const reqs = [
      { name: 'hma' as const, params: { length: cfg.trend.hmaLen } },
      { name: 'kama' as const, params: { length: cfg.trend.kamaLen } },
      { name: 'atr' as const, params: { length: cfg.vol.atrLen } },
      { name: 'bb' as const, params: { length: cfg.vol.bbLen, mult: 2 } },
      { name: 'rsi' as const, params: { length: 14 } },
      { name: 'supertrend' as const, params: { atrLen: cfg.vol.atrLen, mult: 3 } },
    ];

    const r = computeIndicators({ tf: f.tf, candles: f.candles as OHLCV[], requests: reqs, price: 'close' });
    const sLen = r.len;
    const hma = r.outputs[`hma_${cfg.trend.hmaLen}`];
    const kama = r.outputs[`kama_${cfg.trend.kamaLen}`];
    const atr = r.outputs[`atr_${cfg.vol.atrLen}`];
    const bbW = r.outputs[`bb_width_${cfg.vol.bbLen}`];
    const st = r.outputs['st_trend'];

    const evid: string[] = [];

    // 趋势方向：HMA 斜率 + KAMA 相对位置
    const li = lastValidIndex(hma);
    const slope = li >= 1 && !isNaN(hma[li - 1]) ? hma[li] - hma[li - 1] : 0;
    const dirSlope = sign(slope);
    const kc = lastValid(kama);
    const cls = f.candles[f.candles.length - 1]?.c;
    const dirKama = kc !== undefined && cls !== undefined ? sign(cls - kc) : 0;
    const trendDir: 1 | -1 | 0 = (dirSlope + dirKama >= 1 ? 1 : dirSlope + dirKama <= -1 ? -1 : 0) as any;
    if (trendDir === 1) evid.push(`趋势方向：HMA 斜率向上且收盘高于 KAMA`);
    else if (trendDir === -1) evid.push(`趋势方向：HMA 斜率向下且收盘低于 KAMA`);
    else evid.push(`趋势方向：信号分歧或不足`);

    // 结构：枢轴 HH/HL 或 LH/LL + Supertrend 方向
    const seriesHigh = Float64Array.from(f.candles.map((k) => k.h));
    const seriesLow = Float64Array.from(f.candles.map((k) => k.l));
    const { ph, pl } = findPivots(seriesHigh, seriesLow, cfg.structure.pivotLeft, cfg.structure.pivotRight);
    let structDir: 1 | -1 | 0 = 0;
    if (ph.length >= 2 && pl.length >= 2) {
      const [ph2, ph1] = ph.slice(-2); // 倒数第二、倒数第一
      const [pl2, pl1] = pl.slice(-2);
      const hh = seriesHigh[ph1] > seriesHigh[ph2];
      const hl = seriesLow[pl1] > seriesLow[pl2];
      const lh = seriesHigh[ph1] < seriesHigh[ph2];
      const ll = seriesLow[pl1] < seriesLow[pl2];
      if (hh && hl) structDir = 1;
      else if (lh && ll) structDir = -1;
    }
    const stLast = lastValid(st);
    if (stLast === 1 && structDir !== -1) structDir = 1;
    if (stLast === -1 && structDir !== 1) structDir = -1;
    if (structDir === 1) evid.push(`结构：近期 HH/HL 或 Supertrend 看多`);
    else if (structDir === -1) evid.push(`结构：近期 LH/LL 或 Supertrend 看空`);
    else evid.push(`结构：无明显趋势结构`);

    // 波动/Regime：nATR 与 BB 宽度相对历史中位数
    const closeArr = Float64Array.from(f.candles.map((k) => k.c));
    const lastClose = closeArr[closeArr.length - 1];
    const natrArr = new Float64Array(atr.length);
    for (let i = 0; i < natrArr.length; i++) natrArr[i] = isNaN(atr[i]) || isNaN(closeArr[i]) || closeArr[i] === 0 ? NaN : atr[i] / closeArr[i];
    const bwNorm = new Float64Array(bbW.length);
    for (let i = 0; i < bwNorm.length; i++) bwNorm[i] = isNaN(bbW[i]) || isNaN(closeArr[i]) || closeArr[i] === 0 ? NaN : bbW[i] / closeArr[i];
    const natrMed = medianIgnoreNaN(natrArr);
    const bwMed = medianIgnoreNaN(bwNorm);
    const natrLast = lastValid(natrArr) ?? NaN;
    const bwLast = lastValid(bwNorm) ?? NaN;
    let regime: 'trend' | 'range' | 'volatile' = 'trend';
    if (!isNaN(natrLast) && !isNaN(bwLast) && !isNaN(natrMed) && !isNaN(bwMed)) {
      const highVol = natrLast > natrMed && bwLast > bwMed;
      const lowVol = natrLast <= natrMed && bwLast <= bwMed;
      if (highVol) regime = 'volatile';
      else if (lowVol) regime = 'range';
      else regime = 'trend';
    }
    const regEase = regime === 'trend' ? 1 : regime === 'range' ? 0.5 : 0.3;
    evid.push(`波动状态：${regime}（nATR=${natrLast?.toFixed(4)}, BB宽比=${bwLast?.toFixed(4)}）`);

    frameOpinions.push({ tf: f.tf, trendDir, structDir, regime, regEase, evidences: evid });
  }

  // 多周期一致性融合
  const nF = frameOpinions.length;
  const pos = frameOpinions.filter((x) => x.trendDir === 1).length;
  const neg = frameOpinions.filter((x) => x.trendDir === -1).length;
  const nonZero = pos + neg;
  const alignPos = pos / nF;
  const alignNeg = neg / nF;
  const dir: 1 | -1 | 0 = alignPos >= input.config.alignMin ? 1 : alignNeg >= input.config.alignMin ? -1 : 0;

  const trendScore = Math.round((Math.max(pos, neg) / nF) * 100);
  const structAligned = frameOpinions.filter((x) => (dir === 0 ? x.structDir !== 0 : x.structDir === dir)).length;
  const structureScore = Math.round((structAligned / nF) * 100);
  const volScore = Math.round((frameOpinions.reduce((a, b) => a + b.regEase, 0) / nF) * 100);

  // 组合得分（限幅）
  const w = cfg.weights;
  let total = Math.round(w.trend * trendScore + w.structure * structureScore + w.volatility * volScore);
  const volatileRatio = frameOpinions.filter((x) => x.regime === 'volatile').length / nF;
  if (volatileRatio > 0.5) total = Math.min(total, 70);

  let regimeOverall: 'trend' | 'range' | 'volatile' = 'trend';
  const rangeRatio = frameOpinions.filter((x) => x.regime === 'range').length / nF;
  if (volatileRatio > 0.5) regimeOverall = 'volatile';
  else if (rangeRatio > 0.5) regimeOverall = 'range';

  let decision: 'long' | 'short' | 'neutral' = 'neutral';
  if (total >= 65) {
    decision = dir === 1 ? 'long' : dir === -1 ? 'short' : 'neutral';
  } else {
    decision = 'neutral';
  }

  const evidence: string[] = [];
  evidence.push(`多周期趋势一致性：多=${pos}/${nF}，空=${neg}/${nF}`);
  evidence.push(`结构对齐：${structAligned}/${nF}`);
  evidence.push(`波动得分：${volScore}`);
  for (const fo of frameOpinions) evidence.push(`[${fo.tf}] ${fo.evidences.join('；')}`);

  const frameAlignment: Record<string, 1 | -1 | 0> = {};
  for (const fo of frameOpinions) frameAlignment[fo.tf] = fo.trendDir;

  return {
    decision,
    regime: regimeOverall,
    score: total,
    breakdown: { trend: trendScore, structure: structureScore, volatility: volScore },
    evidence,
    frameAlignment,
  };
}

export default taSetupAgent;
