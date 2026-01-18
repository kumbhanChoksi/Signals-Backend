import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ingestCandles } from '../controllers/candle.controller';

const router = Router();

router.post('/', authenticateToken, ingestCandles);

export default router;
