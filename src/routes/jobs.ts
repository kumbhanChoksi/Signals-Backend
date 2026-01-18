import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getJobStatus } from '../controllers/job.controller';

const router = Router();

router.get('/:jobId', authenticateToken, getJobStatus);

export default router;
