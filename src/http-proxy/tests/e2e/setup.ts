// Set environment variables BEFORE any imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.GATEWAY_WS_URL = 'ws://localhost:8081';

import { createServer, Server } from 'http';
import { app } from '../../src/app';
import { WebSocketServer } from '../../src/websocket/server';
import { jwtService, deviceService } from '../../src/routes/auth.routes';

let httpServer: Server;
let wsServer: WebSocketServer;
export let testPort: number;

beforeAll(async () => {
  httpServer = createServer(app);
  wsServer = new WebSocketServer(httpServer, jwtService, deviceService);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => {
      const addr = httpServer.address();
      testPort = typeof addr === 'object' && addr ? addr.port : 3000;
      process.env.PORT = testPort.toString();
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    wsServer?.close();
    httpServer?.close(() => resolve());
  });
  await new Promise(resolve => setTimeout(resolve, 100));
});
