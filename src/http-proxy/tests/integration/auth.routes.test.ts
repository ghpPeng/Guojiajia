import request from 'supertest';
import { app } from '../../src/app';

describe('Auth Routes Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new device successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          deviceName: 'Test Phone',
          deviceType: 'android',
          osVersion: '13.0',
          appVersion: '1.0.0',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.deviceId).toBeDefined();
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          deviceName: 'Test Phone',
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject registration with invalid device type', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          deviceName: 'Test Phone',
          deviceType: 'invalid-type',
          osVersion: '13.0',
          appVersion: '1.0.0',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('deviceType');
    });
  });

  describe('GET /api/auth/verify', () => {
    let token: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          deviceName: 'Test Phone',
          deviceType: 'android',
          osVersion: '13.0',
          appVersion: '1.0.0',
        });

      token = response.body.data.token;
    });

    it('should verify a valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceId).toBeDefined();
    });

    it('should reject request without token', async () => {
      await request(app)
        .get('/api/auth/verify')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
