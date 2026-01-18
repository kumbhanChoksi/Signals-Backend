import request from 'supertest';
import app from '../src/index';

describe('Auth API', () => {
  it('should login successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({
        email: 'john@acme.com',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('john@acme.com');
    expect(res.body.user).toHaveProperty('tenantId');
  });

  it('should fail login with invalid password', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({
        email: 'john@acme.com',
        password: 'wrong-password',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('should fail login with missing fields', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({
        email: 'john@acme.com',
      });

    expect(res.status).toBe(400);
  });
});
