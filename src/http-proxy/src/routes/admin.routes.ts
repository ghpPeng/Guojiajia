import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { deviceService } from './auth.routes';

const router = Router();

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';
const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-secret-key';

// POST /api/admin/login
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }
  const token = jwt.sign({ role: 'admin' }, ADMIN_SECRET, { expiresIn: '8h' });
  res.json({ success: true, data: { token } });
});

const adminAuth = (req: Request, res: Response, next: () => void) => {
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

// GET /api/admin/stats
router.get('/stats', adminAuth as any, (_req: Request, res: Response) => {
  const devices = deviceService.getAllDevices();
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const onlineDevices = devices.filter(d => new Date(d.lastActiveAt) > fiveMinAgo).length;
  res.json({
    success: true,
    data: {
      totalDevices: devices.length,
      onlineDevices,
      totalMessages: 0,
      errorRate: 0,
    }
  });
});

export { router as adminRoutes };
