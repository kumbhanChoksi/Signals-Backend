import redisConnection from '../queues/redis';

const CACHE_TTL_SECONDS = 60;

function latestSignalKey(tenantId: string) {
  return `signal:latest:${tenantId}`;
}

export async function getLatestSignal(tenantId: string) {
  try {
    const cached = await redisConnection.get(latestSignalKey(tenantId));
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export async function setLatestSignal(tenantId: string, signal: any) {
  try {
    await redisConnection.set(
      latestSignalKey(tenantId),
      JSON.stringify(signal),
      'EX',
      CACHE_TTL_SECONDS
    );
  } catch {
    // Cache failures should not affect core flow.
  }
}

export async function invalidateLatestSignal(tenantId: string) {
  try {
    await redisConnection.del(latestSignalKey(tenantId));
  } catch {
    // Cache failures should not affect core flow.
  }
}
