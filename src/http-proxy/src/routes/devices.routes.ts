import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { deviceService } from './auth.routes';

const router = Router();

const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-secret-key';

const adminAuth = (req: Request, res: Response, next: NextFunction): void => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  try {
    jwt.verify(auth.split(' ')[1], ADMIN_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// Get all devices (admin only)
router.get('/', adminAuth, async (_req, res) => {
  try {
    const devices = deviceService.getAllDevices();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    res.json({
      success: true,
      data: devices.map(d => ({
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        deviceType: d.deviceType,
        status: new Date(d.lastActiveAt) > fiveMinAgo ? 'online' : 'offline',
        lastSeen: d.lastActiveAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch devices'
    });
  }
});

// Delete device (admin only)
router.delete('/:deviceId', adminAuth, async (req, res) => {
  try {
    const { deviceId } = req.params;
    await deviceService.deleteDevice(deviceId);
    res.json({
      success: true,
      message: 'Device deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete device'
    });
  }
});

// Get admin stats
router.get('/admin/stats', adminAuth, async (_req, res) => {
  try {
    const devices = deviceService.getAllDevices();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineDevices = devices.filter(d => new Date(d.lastActiveAt) > fiveMinAgo);

    res.json({
      success: true,
      data: {
        totalDevices: devices.length,
        onlineDevices: onlineDevices.length,
        offlineDevices: devices.length - onlineDevices.length,
        messagesToday: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

export { router as deviceRoutes };
