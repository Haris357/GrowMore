/**
 * Client-side technical-analysis engine.
 *
 * Computes the full indicator set shown in the stock detail "Technicals" tab
 * from a plain OHLCV series (daily EOD candles). Everything is derived here so
 * the backend doesn't need a technicals endpoint. All functions guard against
 * short/gappy series and return `null` when there isn't enough data.
 */

export type Signal = 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';

export interface Candle {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
}

export interface IndicatorRow {
  name: string;
  value: number | null;
  display: string;
  signal: Signal;
}

export interface GaugeSummary {
  signal: Signal;
  buy: number;
  neutral: number;
  sell: number;
  total: number;
}

export interface RangeInfo {
  low: number | null;
  high: number | null;
  position: number | null; // 0..100 where current price sits in the range
}

export interface PatternFlag {
  label: string;
  active: boolean;
}

export interface Technicals {
  asOf: string | null;
  price: number | null;
  oscillators: IndicatorRow[];
  movingAverages: IndicatorRow[];
  oscillatorSummary: GaugeSummary;
  movingAverageSummary: GaugeSummary;
  overallSummary: GaugeSummary;
  range52w: RangeInfo;
  range20d: RangeInfo;
  range30d: RangeInfo;
  distFrom52wHigh: number | null;
  distFrom52wLow: number | null;
  bollinger: { lower: number | null; middle: number | null; upper: number | null; width: number | null; position: number | null };
  volatility: {
    atr14: number | null; atr7: number | null; atr21: number | null; atrTrendPct: number | null;
    histVol20: number | null; histVol50: number | null;
    relVol20: number | null; relVol50: number | null;
    obv: number | null; adLine: number | null;
    volSma10: number | null; volSma20: number | null; volSma50: number | null;
    vwap: number | null; psar: number | null;
  };
  patterns: PatternFlag[];
  enoughData: boolean;
}

// ── primitive helpers ────────────────────────────────────────────────────────

const last = <T>(a: T[]): T | undefined => a[a.length - 1];

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  let s = 0;
  for (let i = values.length - period; i < values.length; i++) s += values[i];
  return s / period;
}

function smaSeries(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

function emaSeries(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    if (prev === null) {
      // seed with SMA of first `period` values
      let s = 0;
      for (let j = i - period + 1; j <= i; j++) s += values[j];
      prev = s / period;
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

function stddev(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(values.length - period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
  return Math.sqrt(variance);
}

// ── indicators ───────────────────────────────────────────────────────────────

function rsi(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff; else loss -= diff;
  }
  let avgGain = gain / period, avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function macd(closes: number[]): { macd: number | null; signal: number | null } {
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  const line: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (ema12[i] != null && ema26[i] != null) line.push((ema12[i] as number) - (ema26[i] as number));
  }
  if (line.length === 0) return { macd: null, signal: null };
  const signalSeries = emaSeries(line, 9);
  return { macd: last(line) ?? null, signal: last(signalSeries) ?? null };
}

function stochasticK(h: number[], l: number[], c: number[], period: number): number | null {
  if (c.length < period) return null;
  const hi = Math.max(...h.slice(h.length - period));
  const lo = Math.min(...l.slice(l.length - period));
  if (hi === lo) return 50;
  return ((last(c) as number - lo) / (hi - lo)) * 100;
}

function cci(h: number[], l: number[], c: number[], period: number): number | null {
  if (c.length < period) return null;
  const tp: number[] = [];
  for (let i = 0; i < c.length; i++) tp.push((h[i] + l[i] + c[i]) / 3);
  const slice = tp.slice(tp.length - period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const meanDev = slice.reduce((a, b) => a + Math.abs(b - mean), 0) / period;
  if (meanDev === 0) return 0;
  return ((last(tp) as number) - mean) / (0.015 * meanDev);
}

function williamsR(h: number[], l: number[], c: number[], period: number): number | null {
  if (c.length < period) return null;
  const hi = Math.max(...h.slice(h.length - period));
  const lo = Math.min(...l.slice(l.length - period));
  if (hi === lo) return -50;
  return ((hi - (last(c) as number)) / (hi - lo)) * -100;
}

function mfi(h: number[], l: number[], c: number[], v: number[], period: number): number | null {
  if (c.length < period + 1) return null;
  let pos = 0, neg = 0;
  const tp = (i: number) => (h[i] + l[i] + c[i]) / 3;
  for (let i = c.length - period; i < c.length; i++) {
    const cur = tp(i), prev = tp(i - 1);
    const rmf = cur * (v[i] || 0);
    if (cur > prev) pos += rmf; else if (cur < prev) neg += rmf;
  }
  if (neg === 0) return 100;
  const mr = pos / neg;
  return 100 - 100 / (1 + mr);
}

function roc(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;
  const past = closes[closes.length - 1 - period];
  if (!past) return null;
  return ((last(closes) as number) / past - 1) * 100;
}

function atr(h: number[], l: number[], c: number[], period: number): number | null {
  if (c.length < period + 1) return null;
  const tr: number[] = [];
  for (let i = 1; i < c.length; i++) {
    tr.push(Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])));
  }
  if (tr.length < period) return null;
  let a = tr.slice(0, period).reduce((x, y) => x + y, 0) / period;
  for (let i = period; i < tr.length; i++) a = (a * (period - 1) + tr[i]) / period;
  return a;
}

function adx(h: number[], l: number[], c: number[], period: number): number | null {
  if (c.length < period * 2) return null;
  const tr: number[] = [], plusDM: number[] = [], minusDM: number[] = [];
  for (let i = 1; i < c.length; i++) {
    const up = h[i] - h[i - 1], down = l[i - 1] - l[i];
    plusDM.push(up > down && up > 0 ? up : 0);
    minusDM.push(down > up && down > 0 ? down : 0);
    tr.push(Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])));
  }
  const wilder = (arr: number[]) => {
    let s = arr.slice(0, period).reduce((x, y) => x + y, 0);
    const out = [s];
    for (let i = period; i < arr.length; i++) { s = s - s / period + arr[i]; out.push(s); }
    return out;
  };
  const trS = wilder(tr), pS = wilder(plusDM), mS = wilder(minusDM);
  const dx: number[] = [];
  for (let i = 0; i < trS.length; i++) {
    const pdi = (pS[i] / trS[i]) * 100, mdi = (mS[i] / trS[i]) * 100;
    const denom = pdi + mdi;
    dx.push(denom === 0 ? 0 : (Math.abs(pdi - mdi) / denom) * 100);
  }
  if (dx.length < period) return last(dx) ?? null;
  let adxVal = dx.slice(0, period).reduce((x, y) => x + y, 0) / period;
  for (let i = period; i < dx.length; i++) adxVal = (adxVal * (period - 1) + dx[i]) / period;
  return adxVal;
}

function obv(c: number[], v: number[]): number | null {
  if (c.length < 2) return null;
  let o = 0;
  for (let i = 1; i < c.length; i++) {
    if (c[i] > c[i - 1]) o += v[i] || 0;
    else if (c[i] < c[i - 1]) o -= v[i] || 0;
  }
  return o;
}

function adLine(h: number[], l: number[], c: number[], v: number[]): number | null {
  if (c.length === 0) return null;
  let ad = 0;
  for (let i = 0; i < c.length; i++) {
    const range = h[i] - l[i];
    const mfm = range === 0 ? 0 : ((c[i] - l[i]) - (h[i] - c[i])) / range;
    ad += mfm * (v[i] || 0);
  }
  return ad;
}

function histVol(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;
  const rets: number[] = [];
  for (let i = closes.length - period; i < closes.length; i++) {
    if (closes[i - 1] > 0) rets.push(Math.log(closes[i] / closes[i - 1]));
  }
  if (rets.length < 2) return null;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

function parabolicSar(h: number[], l: number[]): number | null {
  if (h.length < 5) return null;
  const afStep = 0.02, afMax = 0.2;
  let up = h[1] >= h[0];
  let sar = up ? l[0] : h[0];
  let ep = up ? h[0] : l[0];
  let af = afStep;
  for (let i = 1; i < h.length; i++) {
    sar = sar + af * (ep - sar);
    if (up) {
      if (l[i] < sar) { up = false; sar = ep; ep = l[i]; af = afStep; }
      else if (h[i] > ep) { ep = h[i]; af = Math.min(af + afStep, afMax); }
    } else {
      if (h[i] > sar) { up = true; sar = ep; ep = h[i]; af = afStep; }
      else if (l[i] < ep) { ep = l[i]; af = Math.min(af + afStep, afMax); }
    }
  }
  return sar;
}

function vwap(h: number[], l: number[], c: number[], v: number[], period: number): number | null {
  if (c.length < period || v.every((x) => !x)) return null;
  let pv = 0, vol = 0;
  for (let i = c.length - period; i < c.length; i++) {
    const tp = (h[i] + l[i] + c[i]) / 3;
    pv += tp * (v[i] || 0);
    vol += v[i] || 0;
  }
  return vol === 0 ? null : pv / vol;
}

// ── signal classification ────────────────────────────────────────────────────

const score = (s: Signal) => (s === 'strong_buy' || s === 'buy' ? 1 : s === 'strong_sell' || s === 'sell' ? -1 : 0);

function summarize(rows: IndicatorRow[]): GaugeSummary {
  let buy = 0, sell = 0, neutral = 0;
  for (const r of rows) {
    const sc = score(r.signal);
    if (sc > 0) buy++; else if (sc < 0) sell++; else neutral++;
  }
  const total = rows.length || 1;
  const net = (buy - sell) / total;
  const signal: Signal =
    net > 0.5 ? 'strong_buy' : net > 0.1 ? 'buy' : net < -0.5 ? 'strong_sell' : net < -0.1 ? 'sell' : 'neutral';
  return { signal, buy, neutral, sell, total: rows.length };
}

const overbought = (v: number | null, hi: number, lo: number): Signal =>
  v == null ? 'neutral' : v >= hi ? 'sell' : v <= lo ? 'buy' : 'neutral';

const maSignal = (price: number, ma: number | null): Signal => {
  if (ma == null || !price) return 'neutral';
  const pct = (price / ma - 1) * 100;
  if (pct >= 2) return 'strong_buy';
  if (pct > 0) return 'buy';
  if (pct <= -2) return 'strong_sell';
  return 'sell';
};

// ── main entry ───────────────────────────────────────────────────────────────

export function computeTechnicals(candles: Candle[]): Technicals {
  const rows = [...candles].sort((a, b) => a.date.localeCompare(b.date));
  const c = rows.map((r) => Number(r.close)).filter((n) => Number.isFinite(n));
  // build parallel H/L/V arrays, falling back to close when OHLC is missing
  const h = rows.map((r) => (r.high != null ? Number(r.high) : Number(r.close)));
  const l = rows.map((r) => (r.low != null ? Number(r.low) : Number(r.close)));
  const v = rows.map((r) => (r.volume != null ? Number(r.volume) : 0));
  const price = c.length ? c[c.length - 1] : null;
  const asOf = rows.length ? (last(rows) as Candle).date : null;
  const enoughData = c.length >= 30;

  const empty: GaugeSummary = { signal: 'neutral', buy: 0, neutral: 0, sell: 0, total: 0 };
  if (!price || !enoughData) {
    return {
      asOf, price, oscillators: [], movingAverages: [],
      oscillatorSummary: empty, movingAverageSummary: empty, overallSummary: empty,
      range52w: { low: null, high: null, position: null },
      range20d: { low: null, high: null, position: null },
      range30d: { low: null, high: null, position: null },
      distFrom52wHigh: null, distFrom52wLow: null,
      bollinger: { lower: null, middle: null, upper: null, width: null, position: null },
      volatility: {
        atr14: null, atr7: null, atr21: null, atrTrendPct: null, histVol20: null, histVol50: null,
        relVol20: null, relVol50: null, obv: null, adLine: null, volSma10: null, volSma20: null,
        volSma50: null, vwap: null, psar: null,
      },
      patterns: [], enoughData: false,
    };
  }

  // Oscillators
  const rsi14 = rsi(c, 14), rsi7 = rsi(c, 7), rsi21 = rsi(c, 21);
  const stoch = stochasticK(h, l, c, 14);
  const stochD = smaSeries(
    c.map((_, i) => {
      const hh = Math.max(...h.slice(Math.max(0, i - 13), i + 1));
      const ll = Math.min(...l.slice(Math.max(0, i - 13), i + 1));
      return hh === ll ? 50 : ((c[i] - ll) / (hh - ll)) * 100;
    }),
    3,
  );
  const m = macd(c);
  const cciV = cci(h, l, c, 20);
  const willR = williamsR(h, l, c, 14);
  const mfiV = mfi(h, l, c, v, 14);
  const roc9 = roc(c, 9), roc21 = roc(c, 21);
  const adxV = adx(h, l, c, 14);

  const oscillators: IndicatorRow[] = [
    { name: 'RSI (14)', value: rsi14, display: rsi14?.toFixed(2) ?? 'N/A', signal: overbought(rsi14, 70, 30) },
    { name: 'RSI (7)', value: rsi7, display: rsi7?.toFixed(2) ?? 'N/A', signal: overbought(rsi7, 70, 30) },
    { name: 'RSI (21)', value: rsi21, display: rsi21?.toFixed(2) ?? 'N/A', signal: overbought(rsi21, 70, 30) },
    { name: 'Stochastic %K', value: stoch, display: stoch != null ? `${stoch.toFixed(2)} / ${(last(stochD) as number | null)?.toFixed(2) ?? '—'}` : 'N/A', signal: overbought(stoch, 80, 20) },
    { name: 'MACD (12,26)', value: m.macd, display: m.macd != null ? `${m.macd.toFixed(2)} / ${m.signal?.toFixed(2) ?? '—'}` : 'N/A', signal: m.macd != null && m.signal != null ? (m.macd > m.signal ? 'buy' : 'sell') : 'neutral' },
    { name: 'CCI (20)', value: cciV, display: cciV?.toFixed(2) ?? 'N/A', signal: cciV == null ? 'neutral' : cciV < -100 ? 'buy' : cciV > 100 ? 'sell' : 'neutral' },
    { name: 'Williams %R', value: willR, display: willR?.toFixed(2) ?? 'N/A', signal: willR == null ? 'neutral' : willR <= -80 ? 'buy' : willR >= -20 ? 'sell' : 'neutral' },
    { name: 'Money Flow Index', value: mfiV, display: mfiV?.toFixed(2) ?? 'N/A', signal: overbought(mfiV, 80, 20) },
    { name: 'ROC (9)', value: roc9, display: roc9 != null ? `${roc9 >= 0 ? '+' : ''}${roc9.toFixed(2)}%` : 'N/A', signal: roc9 == null ? 'neutral' : roc9 > 0 ? 'buy' : 'sell' },
    { name: 'ROC (21)', value: roc21, display: roc21 != null ? `${roc21 >= 0 ? '+' : ''}${roc21.toFixed(2)}%` : 'N/A', signal: roc21 == null ? 'neutral' : roc21 > 0 ? 'buy' : 'sell' },
    { name: 'ADX (14)', value: adxV, display: adxV?.toFixed(2) ?? 'N/A', signal: 'neutral' },
  ];

  // Moving averages
  const maDefs: [string, 'sma' | 'ema', number][] = [
    ['SMA (5)', 'sma', 5], ['SMA (10)', 'sma', 10], ['SMA (20)', 'sma', 20],
    ['SMA (50)', 'sma', 50], ['SMA (100)', 'sma', 100], ['SMA (200)', 'sma', 200],
    ['EMA (9)', 'ema', 9], ['EMA (12)', 'ema', 12], ['EMA (20)', 'ema', 20],
    ['EMA (26)', 'ema', 26], ['EMA (50)', 'ema', 50], ['EMA (200)', 'ema', 200],
  ];
  const movingAverages: IndicatorRow[] = maDefs.map(([name, type, period]) => {
    const val = type === 'sma' ? sma(c, period) : (last(emaSeries(c, period)) ?? null);
    const pct = val != null && price ? (price / val - 1) * 100 : null;
    return {
      name,
      value: val,
      display: val != null ? `${val.toFixed(2)}${pct != null ? `  (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)` : ''}` : 'N/A',
      signal: maSignal(price, val),
    };
  });

  const oscillatorSummary = summarize(oscillators);
  const movingAverageSummary = summarize(movingAverages);
  const overallSummary = summarize([...oscillators, ...movingAverages]);

  // Ranges
  const rangeOf = (win: number): RangeInfo => {
    if (c.length < 2) return { low: null, high: null, position: null };
    const n = Math.min(win, c.length);
    const lo = Math.min(...l.slice(l.length - n));
    const hi = Math.max(...h.slice(h.length - n));
    const pos = hi === lo ? 50 : ((price - lo) / (hi - lo)) * 100;
    return { low: lo, high: hi, position: pos };
  };
  const range52w = rangeOf(252);
  const range20d = rangeOf(20);
  const range30d = rangeOf(30);
  const distFrom52wHigh = range52w.high ? (price / range52w.high - 1) * 100 : null;
  const distFrom52wLow = range52w.low ? (price / range52w.low - 1) * 100 : null;

  // Bollinger (20, 2σ)
  const mid = sma(c, 20);
  const sd = stddev(c, 20);
  const upper = mid != null && sd != null ? mid + 2 * sd : null;
  const lower = mid != null && sd != null ? mid - 2 * sd : null;
  const bbWidth = mid && upper != null && lower != null ? ((upper - lower) / mid) * 100 : null;
  const bbPos = upper != null && lower != null && upper !== lower ? ((price - lower) / (upper - lower)) * 100 : null;

  // Volatility & volume
  const atr14 = atr(h, l, c, 14), atr7 = atr(h, l, c, 7), atr21 = atr(h, l, c, 21);
  const atrPrev = atr(h.slice(0, -1), l.slice(0, -1), c.slice(0, -1), 14);
  const atrTrendPct = atr14 != null && atrPrev ? (atr14 / atrPrev - 1) * 100 : null;
  const volSma10 = sma(v, 10), volSma20 = sma(v, 20), volSma50 = sma(v, 50);
  const curVol = last(v) ?? null;
  const relVol20 = volSma20 && curVol != null ? curVol / volSma20 : null;
  const relVol50 = volSma50 && curVol != null ? curVol / volSma50 : null;

  // Bollinger width trend for "BB expanding"
  const midPrev = sma(c.slice(0, -1), 20);
  const sdPrev = stddev(c.slice(0, -1), 20);
  const bbWidthPrev = midPrev && sdPrev != null ? ((midPrev + 2 * sdPrev - (midPrev - 2 * sdPrev)) / midPrev) * 100 : null;

  const high20 = Math.max(...h.slice(h.length - Math.min(21, h.length), h.length - 1));
  const low20 = Math.min(...l.slice(l.length - Math.min(21, l.length), l.length - 1));
  const high30 = Math.max(...h.slice(h.length - Math.min(31, h.length), h.length - 1));
  const low30 = Math.min(...l.slice(l.length - Math.min(31, l.length), l.length - 1));

  const patterns: PatternFlag[] = [
    { label: '20D Breakout', active: price > high20 },
    { label: '30D Breakout', active: price > high30 },
    { label: '20D Breakdown', active: price < low20 },
    { label: '30D Breakdown', active: price < low30 },
    { label: 'BB Expanding', active: bbWidth != null && bbWidthPrev != null && bbWidth > bbWidthPrev },
    { label: 'ATR Rising', active: atrTrendPct != null && atrTrendPct > 0 },
    { label: 'Above BB Upper', active: upper != null && price > upper },
  ];

  return {
    asOf, price, oscillators, movingAverages,
    oscillatorSummary, movingAverageSummary, overallSummary,
    range52w, range20d, range30d, distFrom52wHigh, distFrom52wLow,
    bollinger: { lower, middle: mid, upper, width: bbWidth, position: bbPos },
    volatility: {
      atr14, atr7, atr21, atrTrendPct,
      histVol20: histVol(c, 20), histVol50: histVol(c, 50),
      relVol20, relVol50,
      obv: obv(c, v), adLine: adLine(h, l, c, v),
      volSma10, volSma20, volSma50,
      vwap: vwap(h, l, c, v, 20), psar: parabolicSar(h, l),
    },
    patterns,
    enoughData: true,
  };
}

// ── presentation helpers (shared with the UI) ────────────────────────────────

export const SIGNAL_LABEL: Record<Signal, string> = {
  strong_buy: 'Strong Buy', buy: 'Buy', neutral: 'Neutral', sell: 'Sell', strong_sell: 'Strong Sell',
};

/** Needle angle in degrees for a gauge, -90 (all sell) .. +90 (all buy). */
export function gaugeAngle(s: GaugeSummary): number {
  const net = s.total ? (s.buy - s.sell) / s.total : 0;
  return net * 90;
}
