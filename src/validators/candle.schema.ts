import { z } from 'zod';

export const candleSchema = z.object({
  symbol: z.string(),
  timeframe: z.string(),
  timestamp: z.string().datetime(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});

export const candlesIngestSchema = z.object({
  candles: z.array(candleSchema),
});
