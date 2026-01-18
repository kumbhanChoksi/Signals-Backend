import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { generateSignal, getLatestSignal, getSignalHistory } from '../controllers/signal.controller';

const router = Router();

router.post('/generate', authenticateToken, generateSignal);
router.get('/latest', authenticateToken, getLatestSignal);
router.get('/history', authenticateToken, getSignalHistory);

export default router;
