import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import prisma from './db';
import routes from './routes';
import redisConnection from './queues/redis';
import logger from './utils/logger';
import errorHandler from './middleware/errorHandler';

const app = express();

const port = process.env.PORT;
const databaseUrl = process.env.DATABASE_URL;

if (!port) {
  console.error('Error: PORT environment variable is required');
  process.exit(1);
}

if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is required');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

app.get('/health', async (req: Request, res: Response) => {
  let dbStatus: 'up' | 'down' = 'up';
  let redisStatus: 'up' | 'down' = 'up';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    dbStatus = 'down';
    logger.error({ err: error }, 'Health check DB failure');
  }

  try {
    const pong = await redisConnection.ping();
    if (pong !== 'PONG') {
      redisStatus = 'down';
      logger.error({ pong }, 'Health check Redis unexpected response');
    }
  } catch (error) {
    redisStatus = 'down';
    logger.error({ err: error }, 'Health check Redis failure');
  }

  const status = dbStatus === 'up' && redisStatus === 'up' ? 'ok' : 'degraded';
  res.json({ status, db: dbStatus, redis: redisStatus });
});

app.use('/v1', routes);
app.use(errorHandler);

async function startServer() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
