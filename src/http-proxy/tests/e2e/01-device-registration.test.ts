import request from 'supertest';
import { app } from '../../src/app';
import { registerDevice } from './helpers/e2e-utils';

describe('E2E: Device Registration Flow', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new device and return JWT token', async () => {
      const deviceName = `test-device-${Date.now()}`;
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          deviceName,
          deviceType: 'embedded',
          osVersion: '1.0.0',
          appVersion: '1.0.0'
        })
        .expect(200);

      expect(response.body.data || response.body).toHaveProperty('token');
      const token = (response.body.data || response.body).token;
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should return existing token for already registered device', async () => {
      const deviceName = `test-device-${Date.now()}`;
      const payload = {
        deviceName,
        deviceType: 'embedded',
        osVersion: '1.0.0',
        appVersion: '1.0.0'
      };

      const firstResponse = await request(app)
        .post('/api/auth/register')
        .send(payload)
        .expect(200);

      const secondResponse = await request(app)
        .post('/api/auth/register')
        .send(payload)
        .expect(200);

      expect(firstResponse.body.token).toBe(secondResponse.body.token);
    });

    it('should reject registration without deviceId', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);
    });

    it('should handle multiple concurrent registrations', async () => {
      const registrations = Array.from({ length: 5 }, (_, i) =>
        registerDevice(`concurrent-device-${i}-${Date.now()}`)
      );

      const results = await Promise.all(registrations);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.token).toBeTruthy();
        expect(result.deviceName).toBeTruthy();
      });

      const tokens = results.map(r => r.token);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(5);
    });
  });
});
