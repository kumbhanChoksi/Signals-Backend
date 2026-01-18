import { Queue } from 'bullmq';
import { redisConnectionOptions } from './redis';

const signalQueue = new Queue('signal-generation', {
  connection: redisConnectionOptions,
});

export default signalQueue;
