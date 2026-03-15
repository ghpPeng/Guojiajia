import WebSocket from 'ws';
import { Server } from 'http';
import { logger } from '../utils/logger';
import { JWTService } from '../services/jwt.service';
import { DeviceService } from '../services/device.service';

export class WebSocketServer {
  private wss: WebSocket.Server;
  private jwtService: JWTService;
  private deviceService: DeviceService;
  private clients: Map<string, WebSocket>;

  constructor(
    server: Server,
    jwtService: JWTService,
    deviceService: DeviceService
  ) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    this.jwtService = jwtService;
    this.deviceService = deviceService;
    this.clients = new Map();

    this.initialize();
  }

  private initialize(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req);
    });

    logger.info('WebSocket server initialized');
  }

  private handleConnection(ws: WebSocket, req: any): void {
    // Extract token from query string
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      logger.warn('WebSocket connection rejected: no token');
      ws.close(1008, 'No token provided');
      return;
    }

    try {
      // Verify token
      const decoded = this.jwtService.verifyToken(token);
      const device = this.deviceService.getDevice(decoded.deviceId);

      if (!device) {
        logger.warn('WebSocket connection rejected: device not found');
        ws.close(1008, 'Device not found');
        return;
      }

      // Store client connection
      this.clients.set(device.deviceId, ws);
      logger.info(`WebSocket connected: ${device.deviceId}`);

      // Update last active
      this.deviceService.updateLastActive(device.deviceId);

      // Handle messages
      ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(device.deviceId, data);
      });

      // Handle close
      ws.on('close', () => {
        this.handleClose(device.deviceId);
      });

      // Handle error
      ws.on('error', (error) => {
        this.handleError(device.deviceId, error);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        payload: {
          deviceId: device.deviceId,
          message: 'Connected to Guojiajia HTTP Proxy',
        },
        timestamp: Date.now(),
      }));
    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      ws.close(1008, 'Authentication failed');
    }
  }

  private handleMessage(deviceId: string, data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      logger.info(`WebSocket message from ${deviceId}:`, message);

      // Update last active
      this.deviceService.updateLastActive(deviceId);

      // Forward to Gateway (mock for now)
      this.forwardToGateway(deviceId, message);
    } catch (error) {
      logger.error(`Error handling message from ${deviceId}:`, error);
    }
  }

  private forwardToGateway(deviceId: string, message: any): void {
    // TODO: Implement actual Gateway forwarding
    // For now, echo back the message
    logger.info(`Forwarding to Gateway for ${deviceId}:`, message);

    const client = this.clients.get(deviceId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'response',
        payload: {
          echo: message,
          message: 'Gateway forwarding not yet implemented',
        },
        timestamp: Date.now(),
      }));
    }
  }

  private handleClose(deviceId: string): void {
    logger.info(`WebSocket disconnected: ${deviceId}`);
    this.clients.delete(deviceId);
  }

  private handleError(deviceId: string, error: Error): void {
    logger.error(`WebSocket error for ${deviceId}:`, error);
    this.clients.delete(deviceId);
  }

  public broadcast(message: any): void {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  public sendToDevice(deviceId: string, message: any): boolean {
    const client = this.clients.get(deviceId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  public getConnectedDevices(): string[] {
    return Array.from(this.clients.keys());
  }

  public close(): void {
    this.clients.forEach((client) => {
      client.close();
    });
    this.wss.close();
    logger.info('WebSocket server closed');
  }
}
