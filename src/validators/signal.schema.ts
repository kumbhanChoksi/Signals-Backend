import { z } from 'zod';

export const signalQuerySchema = z.object({
  symbol: z.string().min(1),
  timeframe: z.string().min(1),
});
