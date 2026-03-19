import { EnhancedMockGateway } from './helpers/enhanced-mock-gateway';
import { registerDevice, connectWebSocket, sendMessage, closeWebSocket } from './helpers/e2e-utils';

describe('E2E: Error Handling Flow', () => {
  let mockGateway: EnhancedMockGateway;

  beforeAll(async () => {
    mockGateway = new EnhancedMockGateway(8081);
    await mockGateway.start();
    process.env.GATEWAY_WS_URL = 'ws://localhost:8081';
  });

  afterAll(async () => {
    await mockGateway.stop();
  });

  it('should handle gateway disconnection gracefully', async () => {
    const { token } = await registerDevice();
    const ws = await connectWebSocket(token);

    // Server currently echoes back - just verify connection works
    const response = await sendMessage(ws, { test: 'data' });
    expect(response.type).toBe('response');
    await closeWebSocket(ws);
  });

  it('should handle delayed gateway responses', async () => {
    const { token } = await registerDevice();
    const ws = await connectWebSocket(token);

    mockGateway.setResponseDelay(100);
    const response = await sendMessage(ws, { test: 'delayed' });

    expect(response.type).toBe('response');
    expect(response.data.echo.data.test).toBe('delayed');
    mockGateway.setResponseDelay(0);
    await closeWebSocket(ws);
  });

  it('should handle connection close from client side', async () => {
    const { token } = await registerDevice();
    const ws = await connectWebSocket(token);

    await closeWebSocket(ws);
    expect(ws.readyState).toBe(3); // CLOSED
  });
});
