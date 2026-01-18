import { Request, Response } from 'express';
import prisma from '../db';
import signalQueue from '../queues/signal.queue';
import { getLatestSignal as getLatestSignalCache, setLatestSignal } from '../cache/signal.cache';
import { signalQuerySchema } from '../validators/signal.schema';
import { signalHistoryQuerySchema } from '../validators/signalHistory.schema';
import logger from '../utils/logger';

export async function generateSignal(req: Request, res: Response) {
  const parsed = signalQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation error', details: parsed.error.issues });
  }

  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { timeframe } = parsed.data;
  const symbol = parsed.data.symbol.toUpperCase();

  try {
    const job = await prisma.job.create({
      data: {
        tenantId,
        type: 'SIGNAL_GENERATION',
        status: 'PENDING',
        payload: { symbol, timeframe },
      },
    });

    await signalQueue.add('signal-generation', {
      jobId: job.id,
      tenantId,
      symbol,
      timeframe,
    });

    res.json({ job_id: job.id });
  } catch (error) {
    logger.error({ err: error }, 'Signal generation error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getLatestSignal(req: Request, res: Response) {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const cachedSignal = await getLatestSignalCache(tenantId);
  if (cachedSignal) {
    return res.json(cachedSignal);
  }

  try {
    const signals = await prisma.signal.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    const latestSignal = signals[0];
    if (!latestSignal) {
      return res.json({ message: 'No signals found' });
    }

    await setLatestSignal(tenantId, latestSignal);
    return res.json(latestSignal);
  } catch (error) {
    logger.error({ err: error }, 'Latest signal retrieval error');
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSignalHistory(req: Request, res: Response) {
  const parsed = signalHistoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation error', details: parsed.error.issues });
  }

  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const page = parsed.data.page ?? 1;
  const limit = parsed.data.limit ?? 20;
  const skip = (page - 1) * limit;

  try {
    const total = await prisma.signal.count({
      where: { tenantId },
    });

    const data = await prisma.signal.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return res.json({
      page,
      limit,
      total,
      data,
    });
  } catch (error) {
    logger.error({ err: error }, 'Signal history error');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
