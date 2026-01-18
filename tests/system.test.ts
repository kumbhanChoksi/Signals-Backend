import request from 'supertest';
import app from '../src/index';

async function login(email: string, password: string) {
  const res = await request(app)
    .post('/v1/auth/login')
    .send({ email, password });
  return res.body.token;
}

describe('System-level APIs', () => {
  let token: string;

  beforeAll(async () => {
    token = await login('john@acme.com', 'password123');
  });

  it('rejects access without JWT (auth validation)', async () => {
    const res = await request(app).get('/v1/signals/latest');
    expect(res.status).toBe(401);
  });

  it('ingests candles idempotently (no duplicates)', async () => {
    const payload = {
      candles: [
        {
          symbol: 'BTCUSDT',
          timeframe: '1m',
          timestamp: '2024-03-01T10:00:00Z',
          open: 100,
          high: 110,
          low: 95,
          close: 105,
          volume: 1000,
        },
      ],
    };

    const headers = {
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': 'test-idempotency-1',
    };

    const first = await request(app)
      .post('/v1/candles')
      .set(headers)
      .send(payload);

    const second = await request(app)
      .post('/v1/candles')
      .set(headers)
      .send(payload);

    expect(first.body.insertedCount).toBe(1);
    expect(second.body.insertedCount).toBe(0);
  });

  it('processes async job and stores signal result', async () => {
    const gen = await request(app)
      .post('/v1/signals/generate?symbol=BTCUSDT&timeframe=1m')
      .set('Authorization', `Bearer ${token}`);

    expect(gen.status).toBe(200);
    const jobId = gen.body.job_id;

    let status = 'PENDING';
    for (let i = 0; i < 15; i++) {
      const job = await request(app)
        .get(`/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`);

      status = job.body.status;
      if (status === 'SUCCESS') {
        expect(job.body.signal).toHaveProperty('output');
        return;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    throw new Error('Job did not complete');
  });

  it('returns latest and history signals correctly', async () => {
    const latest = await request(app)
      .get('/v1/signals/latest')
      .set('Authorization', `Bearer ${token}`);

    expect(latest.status).toBe(200);
    expect(latest.body).toHaveProperty('output');

    const history = await request(app)
      .get('/v1/signals/history?page=1&limit=5')
      .set('Authorization', `Bearer ${token}`);

    expect(history.status).toBe(200);
    expect(Array.isArray(history.body.data)).toBe(true);
    expect(history.body.data.length).toBeGreaterThan(0);
  });
});
