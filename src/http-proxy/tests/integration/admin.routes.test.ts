import request from 'supertest';
import { app } from '../../src/app';

const ADMIN_CREDS = { username: 'admin', password: 'admin123' };

async function getAdminToken(): Promise<string> {
  const res = await request(app).post('/api/admin/login').send(ADMIN_CREDS);
  return res.body.data.token;
}

async function registerDevice() {
  const res = await request(app).post('/api/auth/register').send({
    deviceName: 'Test Device',
    deviceType: 'ios',
    osVersion: '17.0',
    appVersion: '1.0.0',
  });
  return res.body.data;
}

describe('Admin Routes', () => {
  describe('POST /api/admin/login', () => {
    it('returns token on valid credentials', async () => {
      const res = await request(app).post('/api/admin/login').send(ADMIN_CREDS).expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('rejects invalid credentials', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin', password: 'wrong' })
        .expect(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/stats', () => {
    it('returns stats with valid admin token', async () => {
      const token = await getAdminToken();
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalDevices).toBeDefined();
      expect(res.body.data.onlineDevices).toBeDefined();
    });

    it('rejects request without token', async () => {
      await request(app).get('/api/admin/stats').expect(401);
    });

    it('rejects device token (wrong secret)', async () => {
      const device = await registerDevice();
      await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${device.token}`)
        .expect(401);
    });
  });
});

describe('Devices Routes', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  describe('GET /api/devices', () => {
    it('returns device list with admin token', async () => {
      await registerDevice();
      const res = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('rejects without token', async () => {
      await request(app).get('/api/devices').expect(401);
    });

    it('each device has required fields', async () => {
      const res = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      if (res.body.data.length > 0) {
        const d = res.body.data[0];
        expect(d.deviceId).toBeDefined();
        expect(d.deviceName).toBeDefined();
        expect(d.deviceType).toBeDefined();
        expect(d.status).toMatch(/^(online|offline)$/);
        expect(d.lastSeen).toBeDefined();
      }
    });
  });

  describe('DELETE /api/devices/:deviceId', () => {
    it('deletes an existing device', async () => {
      const device = await registerDevice();
      const res = await request(app)
        .delete(`/api/devices/${device.deviceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects delete without token', async () => {
      await request(app).delete('/api/devices/some-id').expect(401);
    });
  });
});
