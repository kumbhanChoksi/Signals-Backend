import { Worker } from 'bullmq';
import { redisConnectionOptions } from '../queues/redis';
import prisma from '../db';
import { generateSignalFromCandles } from '../strategies/signal.strategy';
import { invalidateLatestSignal } from '../cache/signal.cache';
import logger from '../utils/logger';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const signalWorker = new Worker(
  'signal-generation',
  async (job) => {
    const { jobId, tenantId, symbol, timeframe } = job.data;

    try {
      logger.info({ jobId, tenantId, symbol, timeframe }, 'Signal job started');

      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'RUNNING' },
      });

      await sleep(5000);

      logger.info({ jobId, tenantId, symbol, timeframe }, 'Signal job received');

      const candlesDesc = await prisma.candle.findMany({
        where: {
          tenantId,
          symbol,
          timeframe,
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });

      const candles = candlesDesc.reverse();
      const signalResult = generateSignalFromCandles(candles);

      await prisma.signal.create({
        data: {
          jobId,
          tenantId,
          output: signalResult.output,
          confidence: signalResult.confidence,
          summary: signalResult.summary,
          features: signalResult.features,
          vetoes: signalResult.vetoes,
        },
      });

      await invalidateLatestSignal(tenantId);

      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'SUCCESS' },
      });

      logger.info({ jobId, tenantId }, 'Signal job succeeded');
    } catch (error) {
      logger.error({ err: error, jobId, tenantId }, 'Signal job failed');

      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  },
  {
    connection: redisConnectionOptions,
  }
);

export default signalWorker;
