import { Request, Response } from 'express';
import prisma from '../db';
import { candlesIngestSchema } from '../validators/candle.schema';
import logger from '../utils/logger';

export async function ingestCandles(req: Request, res: Response) {
  try {
    const parsed = candlesIngestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation error', details: parsed.error.issues });
    }

    const candles = parsed.data.candles;
    const tenantId = req.user?.tenantId;
    const idempotencyKey = req.header('Idempotency-Key');

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (idempotencyKey) {
      const existingKey = await prisma.idempotencyKey.findFirst({
        where: {
          key: idempotencyKey,
          tenantId,
        },
      });

      if (existingKey) {
        return res.json({ insertedCount: 0 });
      }
    }

    const candlesToInsert = candles.map((candle: any) => ({
      tenantId,
      symbol: candle.symbol.toUpperCase(),
      timeframe: candle.timeframe,
      timestamp: new Date(candle.timestamp),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    }));

    const result = await prisma.candle.createMany({
      data: candlesToInsert,
      skipDuplicates: true,
    });

    if (idempotencyKey) {
      await prisma.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          tenantId,
        },
      });
    }

    res.json({ insertedCount: result.count });
  } catch (error) {
    logger.error({ err: error }, 'Candle ingestion error');
    res.status(500).json({ error: 'Internal server error' });
  }
}
