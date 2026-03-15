import { app } from './app';
import { appConfig } from './config';
import { logger } from './utils/logger';
import { WebSocketServer } from './websocket/server';
import { jwtService, deviceService } from './routes/auth.routes';
import { createServer } from 'http';

const PORT = appConfig.port;

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
const wsServer = new WebSocketServer(server, jwtService, deviceService);

server.listen(PORT, () => {
  logger.info(`HTTP Proxy server started on port ${PORT}`);
  logger.info(`Environment: ${appConfig.nodeEnv}`);
  logger.info(`Gateway URL: ${appConfig.gateway.wsUrl}`);
  logger.info(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutdown signal received: closing servers');
  wsServer.close();
  server.close(() => {
    logger.info('Servers closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default server;
export { wsServer };
