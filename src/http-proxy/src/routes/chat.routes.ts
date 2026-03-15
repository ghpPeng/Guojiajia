import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { JWTService } from '../services/jwt.service';
import { DeviceService } from '../services/device.service';
import { WebSocketServer } from '../websocket/server';

export const createChatRoutes = (
  jwtService: JWTService,
  deviceService: DeviceService,
  wsServer: WebSocketServer
) => {
  const router = Router();
  const chatController = new ChatController(wsServer);

  // All chat routes require authentication
  router.use(authMiddleware(jwtService, deviceService));

  // Send message
  router.post('/message', chatController.sendMessage);

  // Get connection status
  router.get('/status', chatController.getStatus);

  return router;
};
