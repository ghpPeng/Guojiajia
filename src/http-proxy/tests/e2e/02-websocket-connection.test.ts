import { EnhancedMockGateway } from './helpers/enhanced-mock-gateway';
import { registerDevice, connectWebSocket, closeWebSocket } from './helpers/e2e-utils';

describe('E2E: WebSocket Connection Flow', () => {
  let mockGateway: EnhancedMockGateway;

  beforeAll(async () => {
    mockGateway = new EnhancedMockGateway(8081);
    await mockGateway.start();
    process.env.GATEWAY_WS_URL = 'ws://localhost:8081';
  });

  afterAll(async () => {
    await mockGateway.stop();
  });

  it('should connect with valid JWT token', async () => {
    const { token } = await registerDevice();
    const ws = await connectWebSocket(token);

    expect(ws.readyState).toBe(1); // OPEN
    await closeWebSocket(ws);
  });

  it('should reject connection with invalid JWT token', async () => {
    await expect(connectWebSocket('invalid-token')).rejects.toThrow();
  });

  it('should reject connection without JWT token', async () => {
    await expect(connectWebSocket('')).rejects.toThrow();
  });

  it('should handle multiple concurrent connections', async () => {
    const devices = await Promise.all([
      registerDevice(),
      registerDevice(),
      registerDevice()
    ]);

    const connections = await Promise.all(
      devices.map(d => connectWebSocket(d.token))
    );

    expect(connections).toHaveLength(3);
    connections.forEach(ws => {
      expect(ws.readyState).toBe(1);
    });

    await Promise.all(connections.map(closeWebSocket));
  });
});
