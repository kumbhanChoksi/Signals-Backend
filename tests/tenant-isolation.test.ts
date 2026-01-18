import request from 'supertest';
import app from '../src/index';

async function login(email: string, password: string) {
  const res = await request(app)
    .post('/v1/auth/login')
    .send({ email, password });

  return res.body.token;
}

describe('Tenant Isolation', () => {
  let acmeToken: string;
  let globexToken: string;

  beforeAll(async () => {
    acmeToken = await login('john@acme.com', 'password123');
    globexToken = await login('john@globex.com', 'password123');
  });

  it('should not allow one tenant to see another tenant’s signals', async () => {
    const genRes = await request(app)
      .post('/v1/signals/generate?symbol=BTCUSDT&timeframe=1m')
      .set('Authorization', `Bearer ${acmeToken}`);

    expect(genRes.status).toBe(200);
    const jobId = genRes.body.job_id;

    let status = 'PENDING';
    for (let i = 0; i < 10; i++) {
      const jobRes = await request(app)
        .get(`/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${acmeToken}`);

      status = jobRes.body.status;
      if (status === 'SUCCESS') break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    expect(status).toBe('SUCCESS');

    const acmeLatest = await request(app)
      .get('/v1/signals/latest')
      .set('Authorization', `Bearer ${acmeToken}`);

    expect(acmeLatest.status).toBe(200);
    expect(acmeLatest.body).toHaveProperty('output');

    const globexLatest = await request(app)
      .get('/v1/signals/latest')
      .set('Authorization', `Bearer ${globexToken}`);

    if (globexLatest.body.output) {
      expect(globexLatest.body.tenantId).not.toBe(acmeLatest.body.tenantId);
    }
  });
});
