export type SignalOutput = 'BUY' | 'SELL' | 'HOLD';

export interface CandleInput {
  timestamp: string | number | Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SignalResult {
  output: SignalOutput;
  confidence: number;
  features: {
    emaFast: number;
    emaSlow: number;
    atr: number;
    trend: 'bullish' | 'bearish' | 'neutral';
  };
  vetoes: string[];
  summary: string;
}

export function calculateEMA(values: number[], period: number): number {
  if (values.length === 0 || period <= 0) {
    return 0;
  }

  const k = 2 / (period + 1);
  let ema = values[0];

  for (let i = 1; i < values.length; i += 1) {
    ema = values[i] * k + ema * (1 - k);
  }

  return ema;
}

export function calculateATR(candles: CandleInput[], period: number): number {
  if (candles.length < 2 || period <= 0) {
    return 0;
  }

  const ranges: number[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const current = candles[i];
    const previousClose = candles[i - 1].close;
    const highLow = current.high - current.low;
    const highClose = Math.abs(current.high - previousClose);
    const lowClose = Math.abs(current.low - previousClose);
    const trueRange = Math.max(highLow, highClose, lowClose);
    ranges.push(trueRange);
  }

  const window = ranges.slice(-period);
  const sum = window.reduce((acc, value) => acc + value, 0);
  return window.length ? sum / window.length : 0;
}

export function generateSignalFromCandles(candles: CandleInput[]): SignalResult {
  if (candles.length < 20) {
    return {
      output: 'HOLD',
      confidence: 0,
      features: {
        emaFast: 0,
        emaSlow: 0,
        atr: 0,
        trend: 'neutral',
      },
      vetoes: ['INSUFFICIENT_CANDLES'],
      summary: 'Insufficient candles to compute indicators.',
    };
  }

  const closes = candles.map((candle) => candle.close);
  const emaFast = calculateEMA(closes, 9);
  const emaSlow = calculateEMA(closes, 21);

  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (emaFast > emaSlow) {
    trend = 'bullish';
  } else if (emaFast < emaSlow) {
    trend = 'bearish';
  }

  const atr = calculateATR(candles, 14);
  const ranges = candles.map((candle) => candle.high - candle.low);
  const averageRange = ranges.reduce((acc, value) => acc + value, 0) / ranges.length;

  const vetoes: string[] = [];
  if (atr > averageRange * 2) {
    vetoes.push('VOLATILITY_SPIKE');
  }

  const emaGap = Math.abs(emaFast - emaSlow);
  const confidence = Math.min(1, averageRange > 0 ? emaGap / averageRange : 0);

  let output: SignalOutput = 'HOLD';
  if (vetoes.length === 0) {
    output = trend === 'bullish' ? 'BUY' : trend === 'bearish' ? 'SELL' : 'HOLD';
  }

  const summaryParts: string[] = [];
  if (vetoes.length > 0) {
    summaryParts.push(`Vetoed by ${vetoes.join(', ')}.`);
  } else {
    summaryParts.push(`Trend is ${trend}.`);
  }
  summaryParts.push(`EMA9=${emaFast.toFixed(4)}, EMA21=${emaSlow.toFixed(4)}, ATR=${atr.toFixed(4)}.`);

  return {
    output,
    confidence,
    features: {
      emaFast,
      emaSlow,
      atr,
      trend,
    },
    vetoes,
    summary: summaryParts.join(' '),
  };
}
