// 指标引擎与常用技术指标实现（HMA/KAMA/Supertrend/ATR/RSI/布林）
// 说明：
// - 遵循项目规范：TypeScript、ESM、zod 校验放顶部，2 空格缩进。
// - 提供批量计算 computeIndicators()，增量 update() 预留（后续可扩展）。
// - 返回 meta.warmup 以指示各指标有效起点，便于上层剔除未收敛区间。

import { z } from 'zod';

// =====================
// 类型与输入输出约定
// =====================

export type OHLCV = { t: number; o: number; h: number; l: number; c: number; v: number };
export type PriceSource = 'close' | 'hl2' | 'hlc3' | 'ohlc4';

export type Series = {
  time: Float64Array;
  open: Float64Array;
  high: Float64Array;
  low: Float64Array;
  close: Float64Array;
  volume: Float64Array;
};

export const IndicatorsInput = z.object({
  tf: z.string(),
  candles: z.array(
    z.object({ t: z.number(), o: z.number(), h: z.number(), l: z.number(), c: z.number(), v: z.number() })
  ),
  requests: z.array(
    z.object({
      name: z.enum(['hma', 'kama', 'supertrend', 'atr', 'rsi', 'bb']),
      params: z.record(z.any()).optional(),
    })
  ),
  price: z.enum(['close', 'hl2', 'hlc3', 'ohlc4']).default('close'),
});
export type IndicatorsInput = z.infer<typeof IndicatorsInput>;

export type IndicatorOutputs = Record<string, Float64Array>;
export type IndicatorMeta = { warmup: number; params: Record<string, any> };
export type IndicatorsOutput = { tf: string; len: number; outputs: IndicatorOutputs; meta: Record<string, IndicatorMeta> };

export type IndicatorCompute = (series: Series, params: Record<string, any>) => {
  output: IndicatorOutputs;
  warmup: number;
};

export type IndicatorUpdate = (state: any, candle: OHLCV) => { state: any; point: Record<string, number> };

export type IndicatorDef = {
  name: 'hma' | 'kama' | 'supertrend' | 'atr' | 'rsi' | 'bb';
  schema: z.ZodTypeAny;
  defaults: Record<string, any>;
  inputs?: string[];
  compute: IndicatorCompute;
  update?: IndicatorUpdate; // 预留，后续实现增量计算
};

// ==============
// 工具函数
// ==============

function toSeries(candles: OHLCV[]): Series {
  const n = candles.length;
  const time = new Float64Array(n);
  const open = new Float64Array(n);
  const high = new Float64Array(n);
  const low = new Float64Array(n);
  const close = new Float64Array(n);
  const volume = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const k = candles[i];
    time[i] = k.t;
    open[i] = k.o;
    high[i] = k.h;
    low[i] = k.l;
    close[i] = k.c;
    volume[i] = k.v;
  }
  return { time, open, high, low, close, volume };
}

function pickPrice(source: PriceSource, s: Series): Float64Array {
  const n = s.close.length;
  switch (source) {
    case 'close':
      return s.close;
    case 'hl2': {
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) out[i] = (s.high[i] + s.low[i]) / 2;
      return out;
    }
    case 'hlc3': {
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) out[i] = (s.high[i] + s.low[i] + s.close[i]) / 3;
      return out;
    }
    case 'ohlc4': {
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) out[i] = (s.open[i] + s.high[i] + s.low[i] + s.close[i]) / 4;
      return out;
    }
  }
}

export function lastValue(arr: Float64Array): number | undefined {
  return arr.length ? arr[arr.length - 1] : undefined;
}

// 数学工具
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// 通用均值/方差/EMA/RMA
function sma(src: Float64Array, length: number): Float64Array {
  const n = src.length;
  const out = new Float64Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += src[i];
    if (i >= length) sum -= src[i - length];
    out[i] = i >= length - 1 ? sum / length : NaN;
  }
  return out;
}

function wma(src: Float64Array, length: number): Float64Array {
  const n = src.length;
  const out = new Float64Array(n);
  const denom = (length * (length + 1)) / 2;
  let window: number[] = [];
  for (let i = 0; i < n; i++) {
    window.push(src[i]);
    if (window.length > length) window.shift();
    if (window.length === length) {
      let acc = 0;
      for (let k = 0; k < length; k++) acc += window[k] * (k + 1);
      out[i] = acc / denom;
    } else out[i] = NaN;
  }
  return out;
}

function ema(src: Float64Array, length: number): Float64Array {
  const n = src.length;
  const out = new Float64Array(n);
  const alpha = 2 / (length + 1);
  let prev = NaN;
  for (let i = 0; i < n; i++) {
    const x = src[i];
    if (i === 0) prev = x;
    else prev = alpha * x + (1 - alpha) * prev;
    out[i] = i >= length - 1 ? prev : NaN;
  }
  return out;
}

// RMA (Wilder's) for ATR/RSI
function rma(src: Float64Array, length: number): Float64Array {
  const n = src.length;
  const out = new Float64Array(n);
  const alpha = 1 / length;
  let prev = NaN;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const x = src[i];
    if (i < length) sum += x;
    if (i === length - 1) {
      prev = sum / length;
      out[i] = prev;
    } else if (i >= length) {
      prev = alpha * x + (1 - alpha) * prev;
      out[i] = prev;
    } else out[i] = NaN;
  }
  return out;
}

function stddev(src: Float64Array, length: number): Float64Array {
  const n = src.length;
  const out = new Float64Array(n);
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const x = src[i];
    sum += x;
    sumSq += x * x;
    if (i >= length) {
      const xPrev = src[i - length];
      sum -= xPrev;
      sumSq -= xPrev * xPrev;
    }
    if (i >= length - 1) {
      const mean = sum / length;
      const variance = Math.max(0, sumSq / length - mean * mean);
      out[i] = Math.sqrt(variance);
    } else out[i] = NaN;
  }
  return out;
}

// =====================
// 注册与执行框架
// =====================

const registry = new Map<string, IndicatorDef>();

export function registerIndicator(def: IndicatorDef): void {
  registry.set(def.name, def);
}

export function computeIndicators(input: IndicatorsInput): IndicatorsOutput {
  const { tf, candles, requests, price } = IndicatorsInput.parse(input);
  const series = toSeries(candles);
  const src = pickPrice(price, series);
  const outputs: IndicatorOutputs = {};
  const meta: Record<string, IndicatorMeta> = {};

  for (const req of requests) {
    const def = registry.get(req.name);
    if (!def) throw new Error(`未注册的指标: ${req.name}`);
    const params = def.schema.parse({ ...def.defaults, ...(req.params || {}) });
    const { output, warmup } = def.compute({ ...series, close: src }, params);
    for (const [k, arr] of Object.entries(output)) {
      outputs[k] = arr;
      meta[k] = { warmup, params };
    }
  }

  return { tf, len: series.close.length, outputs, meta };
}

// =====================
// 指标实现区域
// =====================

// 1) HMA — Hull Moving Average
const HMAParams = z.object({ length: z.number().int().min(2).default(55) });
registerIndicator({
  name: 'hma',
  schema: HMAParams,
  defaults: { length: 55 },
  compute: (s: Series, p: z.infer<typeof HMAParams>) => {
    const L = p.length;
    const L2 = Math.max(2, Math.floor(L / 2));
    const Ls = Math.max(2, Math.floor(Math.sqrt(L)));
    const wmaL = wma(s.close, L);
    const wmaL2 = wma(s.close, L2);

    // diff = 2*WMA(L/2) - WMA(L)
    const n = s.close.length;
    const diff = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = wmaL2[i];
      const b = wmaL[i];
      diff[i] = isNaN(a) || isNaN(b) ? NaN : 2 * a - b;
    }
    const hmaArr = wma(diff, Ls);
    const warmup = (L - 1) + (Ls - 1); // 近似有效起点
    return { output: { [`hma_${L}`]: hmaArr }, warmup };
  },
});

// 2) KAMA — Kaufman's Adaptive Moving Average
const KAMAParams = z.object({ length: z.number().int().min(2).default(30), fast: z.number().int().min(2).default(2), slow: z.number().int().min(2).default(30) });
registerIndicator({
  name: 'kama',
  schema: KAMAParams,
  defaults: { length: 30, fast: 2, slow: 30 },
  compute: (s: Series, p: z.infer<typeof KAMAParams>) => {
    const { length: erLen, fast, slow } = p;
    const n = s.close.length;
    const out = new Float64Array(n);

    const fastSC = 2 / (fast + 1);
    const slowSC = 2 / (slow + 1);

    // KAMA 需要先有第一个种子值：通常取第 erLen 根的 SMA 或 close
    // 这里采用：首次有效位置 seed = SMA(erLen)
    const seedArr = sma(s.close, erLen);
    let kama = NaN;
    for (let i = 0; i < n; i++) {
      if (i < erLen) {
        out[i] = NaN;
        continue;
      }
      const change = Math.abs(s.close[i] - s.close[i - erLen]);
      let volatility = 0;
      for (let k = i - erLen + 1; k <= i; k++) {
        volatility += Math.abs(s.close[k] - s.close[k - 1]);
      }
      const ER = volatility === 0 ? 0 : change / volatility; // 0..1
      const SC = Math.pow(ER * (fastSC - slowSC) + slowSC, 2);
      if (isNaN(kama)) kama = seedArr[i];
      kama = kama + SC * (s.close[i] - kama);
      out[i] = kama;
    }
    const warmup = erLen + slow; // 保守 warmup
    return { output: { [`kama_${erLen}`]: out }, warmup };
  },
});

// 3) ATR — Average True Range (Wilder)
const ATRParams = z.object({ length: z.number().int().min(1).default(14) });
registerIndicator({
  name: 'atr',
  schema: ATRParams,
  defaults: { length: 14 },
  compute: (s: Series, p: z.infer<typeof ATRParams>) => {
    const L = p.length;
    const n = s.close.length;
    const tr = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      if (i === 0) tr[i] = s.high[i] - s.low[i];
      else {
        const a = s.high[i] - s.low[i];
        const b = Math.abs(s.high[i] - s.close[i - 1]);
        const c = Math.abs(s.low[i] - s.close[i - 1]);
        tr[i] = Math.max(a, b, c);
      }
    }
    const atrArr = rma(tr, L);
    const warmup = L;
    return { output: { [`atr_${L}`]: atrArr }, warmup };
  },
});

// 4) RSI — Relative Strength Index (Wilder)
const RSIParams = z.object({ length: z.number().int().min(2).default(14) });
registerIndicator({
  name: 'rsi',
  schema: RSIParams,
  defaults: { length: 14 },
  compute: (s: Series, p: z.infer<typeof RSIParams>) => {
    const L = p.length;
    const n = s.close.length;
    const up = new Float64Array(n);
    const dn = new Float64Array(n);
    up[0] = 0; dn[0] = 0;
    for (let i = 1; i < n; i++) {
      const ch = s.close[i] - s.close[i - 1];
      up[i] = ch > 0 ? ch : 0;
      dn[i] = ch < 0 ? -ch : 0;
    }
    const avgUp = rma(up, L);
    const avgDn = rma(dn, L);
    const rsiArr = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const u = avgUp[i];
      const d = avgDn[i];
      if (isNaN(u) || isNaN(d)) rsiArr[i] = NaN;
      else if (d === 0) rsiArr[i] = 100;
      else {
        const rs = u / d;
        rsiArr[i] = 100 - 100 / (1 + rs);
      }
    }
    const warmup = L;
    return { output: { [`rsi_${L}`]: rsiArr }, warmup };
  },
});

// 5) Bollinger Bands
const BBParams = z.object({ length: z.number().int().min(2).default(20), mult: z.number().positive().default(2) });
registerIndicator({
  name: 'bb',
  schema: BBParams,
  defaults: { length: 20, mult: 2 },
  compute: (s: Series, p: z.infer<typeof BBParams>) => {
    const L = p.length;
    const mult = p.mult;
    const mid = sma(s.close, L);
    const sd = stddev(s.close, L);
    const n = s.close.length;
    const up = new Float64Array(n);
    const dn = new Float64Array(n);
    const width = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      if (isNaN(mid[i]) || isNaN(sd[i])) {
        up[i] = NaN; dn[i] = NaN; width[i] = NaN;
      } else {
        up[i] = mid[i] + mult * sd[i];
        dn[i] = mid[i] - mult * sd[i];
        width[i] = up[i] - dn[i];
      }
    }
    const warmup = L;
    const keyMid = `bb_mid_${L}`;
    const keyUp = `bb_up_${L}_${mult}`;
    const keyDn = `bb_dn_${L}_${mult}`;
    const keyW = `bb_width_${L}`;
    return { output: { [keyMid]: mid, [keyUp]: up, [keyDn]: dn, [keyW]: width }, warmup };
  },
});

// 6) Supertrend (基于 ATR)
const STParams = z.object({ atrLen: z.number().int().min(1).default(10), mult: z.number().positive().default(3) });
registerIndicator({
  name: 'supertrend',
  schema: STParams,
  defaults: { atrLen: 10, mult: 3 },
  inputs: ['atr'],
  compute: (s: Series, p: z.infer<typeof STParams>) => {
    const { atrLen, mult } = p;
    // 先计算 ATR
    const tmpATR = registry.get('atr')!.compute(s, { length: atrLen }).output[`atr_${atrLen}`];
    const n = s.close.length;
    const basicUpper = new Float64Array(n);
    const basicLower = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const hl2 = (s.high[i] + s.low[i]) / 2;
      const atr = tmpATR[i];
      if (isNaN(atr)) {
        basicUpper[i] = NaN;
        basicLower[i] = NaN;
      } else {
        basicUpper[i] = hl2 + mult * atr;
        basicLower[i] = hl2 - mult * atr;
      }
    }
    const finalUpper = new Float64Array(n);
    const finalLower = new Float64Array(n);
    const trend = new Float64Array(n); // 1 / -1

    finalUpper[0] = NaN;
    finalLower[0] = NaN;
    trend[0] = 0;

    for (let i = 1; i < n; i++) {
      // 更新 Final Upper/Lower
      const bu = basicUpper[i];
      const bl = basicLower[i];
      const prevFU = finalUpper[i - 1];
      const prevFL = finalLower[i - 1];
      const prevClose = s.close[i - 1];

      finalUpper[i] = isNaN(bu) || isNaN(prevFU) || isNaN(prevClose)
        ? NaN
        : (bu < prevFU || prevClose > prevFU) ? bu : prevFU;

      finalLower[i] = isNaN(bl) || isNaN(prevFL) || isNaN(prevClose)
        ? NaN
        : (bl > prevFL || prevClose < prevFL) ? bl : prevFL;

      // 趋势判定
      const prevTrend = trend[i - 1];
      if (!isNaN(finalUpper[i - 1]) && s.close[i] > finalUpper[i - 1]) trend[i] = 1;
      else if (!isNaN(finalLower[i - 1]) && s.close[i] < finalLower[i - 1]) trend[i] = -1;
      else trend[i] = prevTrend;
    }

    const warmup = atrLen + 2;
    return { output: { st_trend: trend, st_upper: finalUpper, st_lower: finalLower }, warmup };
  },
});

// ==============
// 供外部使用的类型 re-export（方便上层 import）
// ==============
export type { IndicatorsOutput as IndicatorsResult };

