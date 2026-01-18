import { Request, Response } from 'express';
import prisma from '../db';
import { jobParamsSchema } from '../validators/job.schema';
import logger from '../utils/logger';

export async function getJobStatus(req: Request, res: Response) {
  const parsedParams = jobParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({ error: 'Validation error', details: parsedParams.error.issues });
  }

  const { jobId } = parsedParams.data;
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        tenantId,
      },
      include: {
        signal: true,
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'SUCCESS') {
      return res.json({ status: job.status });
    }

    return res.json({ status: job.status, signal: job.signal });
  } catch (error) {
    logger.error({ err: error }, 'Job status error');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
