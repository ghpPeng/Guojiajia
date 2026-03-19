import { EnhancedMockGateway } from './helpers/enhanced-mock-gateway';
import { registerDevice, connectWebSocket, sendMessage, closeWebSocket } from './helpers/e2e-utils';

describe('E2E: Full Integration Flow', () => {
  let mockGateway: EnhancedMockGateway;

  beforeAll(async () => {
    mockGateway = new EnhancedMockGateway(8081);
    await mockGateway.start();
    process.env.GATEWAY_WS_URL = 'ws://localhost:8081';
  });

  afterAll(async () => {
    await mockGateway.stop();
  });

  it('should complete full user journey', async () => {
    // 1. Register device
    const { token, deviceName } = await registerDevice();
    expect(token).toBeTruthy();

    // 2. Connect WebSocket
    const ws = await connectWebSocket(token);
    expect(ws.readyState).toBe(1);

    // 3. Send message
    const response = await sendMessage(ws, { deviceName, message: 'Hello' });
    expect(response.data.echo.data.message).toBe('Hello');

    // 4. Disconnect
    await closeWebSocket(ws);
    expect(ws.readyState).toBe(3);
  });

  it('should handle multiple devices with full journey', async () => {
    const journeys = Array.from({ length: 3 }, async (_, i) => {
      const { token } = await registerDevice(`journey-device-${i}`);
      const ws = await connectWebSocket(token);
      const response = await sendMessage(ws, { index: i });
      await closeWebSocket(ws);
      return response;
    });

    const results = await Promise.all(journeys);
    expect(results).toHaveLength(3);
  });

  it('should handle load test with 50 messages', async () => {
    const { token } = await registerDevice();
    const ws = await connectWebSocket(token);

    const messages = Array.from({ length: 50 }, (_, i) =>
      sendMessage(ws, { index: i })
    );

    const start = Date.now();
    const responses = await Promise.all(messages);
    const duration = Date.now() - start;

    expect(responses).toHaveLength(50);
    expect(duration).toBeLessThan(10000); // Should complete in 10s

    await closeWebSocket(ws);
  });
});
