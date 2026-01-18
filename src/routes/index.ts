import { Router } from 'express';
import authRouter from './auth';
import candlesRouter from './candles';
import signalsRouter from './signals';
import jobsRouter from './jobs';

const router = Router();

router.use('/auth', authRouter);
router.use('/candles', candlesRouter);
router.use('/signals', signalsRouter);
router.use('/jobs', jobsRouter);

export default router;
