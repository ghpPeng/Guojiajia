import WebSocket from 'ws';
import { WebSocketServer } from '../../src/websocket/server';
import { JWTService } from '../../src/services/jwt.service';
import { DeviceService } from '../../src/services/device.service';
import { createServer } from 'http';

describe('WebSocketServer', () => {
  let server: any;
  let wsServer: WebSocketServer;
  let jwtService: JWTService;
  let deviceService: DeviceService;
  let token: string;
  let deviceId: string;

  beforeEach(() => {
    server = createServer();
    jwtService = new JWTService();
    deviceService = new DeviceService();

    // Register a device
    const device = deviceService.registerDevice({
      deviceName: 'Test Device',
      deviceType: 'android',
      osVersion: '13.0',
      appVersion: '1.0.0',
    });
    deviceId = device.deviceId;
    token = jwtService.generateToken({
      deviceId: device.deviceId,
      deviceType: device.deviceType,
    });

    wsServer = new WebSocketServer(server, jwtService, deviceService);
    server.listen(0); // Random port
  });

  afterEach((done) => {
    wsServer.close();
    server.close(done);
  });

  it('should accept connection with valid token', (done) => {
    const port = server.address().port;
    const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
      done();
    });

    ws.on('error', (error) => {
      done(error);
    });
  });

  it('should reject connection without token', (done) => {
    const port = server.address().port;
    const ws = new WebSocket(`ws://localhost:${port}/ws`);

    ws.on('close', (code) => {
      expect(code).toBe(1008);
      done();
    });

    ws.on('error', () => {
      // Expected
    });
  });

  it('should reject connection with invalid token', (done) => {
    const port = server.address().port;
    const ws = new WebSocket(`ws://localhost:${port}/ws?token=invalid`);

    ws.on('close', (code) => {
      expect(code).toBe(1008);
      done();
    });

    ws.on('error', () => {
      // Expected
    });
  });

  it('should receive welcome message on connection', (done) => {
    const port = server.address().port;
    const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message.type).toBe('connected');
      expect(message.payload.deviceId).toBe(deviceId);
      ws.close();
      done();
    });
  });

  it('should echo messages back (mock gateway)', (done) => {
    const port = server.address().port;
    const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

    let messageCount = 0;

    ws.on('message', (data) => {
      messageCount++;
      if (messageCount === 1) {
        // Welcome message
        ws.send(JSON.stringify({
          type: 'chat',
          payload: { message: 'Hello' },
        }));
      } else if (messageCount === 2) {
        // Echo response
        const message = JSON.parse(data.toString());
        expect(message.type).toBe('response');
        ws.close();
        done();
      }
    });
  });

  it('should track connected devices', (done) => {
    const port = server.address().port;
    const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

    ws.on('open', () => {
      const connected = wsServer.getConnectedDevices();
      expect(connected).toContain(deviceId);
      ws.close();
      done();
    });
  });

  it('should remove device on disconnect', (done) => {
    const port = server.address().port;
    const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

    ws.on('open', () => {
      ws.close();
    });

    ws.on('close', () => {
      setTimeout(() => {
        const connected = wsServer.getConnectedDevices();
        expect(connected).not.toContain(deviceId);
        done();
      }, 100);
    });
  });
});
