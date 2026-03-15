import { Router, Request, Response } from 'express';
import { authRoutes } from './auth.routes';
import { healthRoutes } from './health.routes';
import { createChatRoutes } from './chat.routes';
import { jwtService, deviceService } from './auth.routes';

const router = Router();

router.use('/auth', authRoutes);

// Detailed health check
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    services: {
      gateway: 'unknown',
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Chat routes will be added when WebSocket server is initialized
export { router as apiRoutes, healthRoutes, createChatRoutes, jwtService, deviceService };
