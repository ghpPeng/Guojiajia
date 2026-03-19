import { EnhancedMockGateway } from './helpers/enhanced-mock-gateway';
import { registerDevice, connectWebSocket, sendMessage, closeWebSocket } from './helpers/e2e-utils';

describe('E2E: Message Forwarding Flow', () => {
  let mockGateway: EnhancedMockGateway;

  beforeAll(async () => {
    mockGateway = new EnhancedMockGateway(8081);
    await mockGateway.start();
    process.env.GATEWAY_WS_URL = 'ws://localhost:8081';
  });

  afterAll(async () => {
    await mockGateway.stop();
  });

  beforeEach(() => {
    mockGateway.clearHistory();
  });

  it('should forward message from client to gateway and back', async () => {
    const { token } = await registerDevice();
    const ws = await connectWebSocket(token);

    const testData = { message: 'Hello Gateway', timestamp: Date.now() };
    const response = await sendMessage(ws, testData);

    expect(response.type).toBe('response');
    expect(response.data.echo.data).toEqual(testData);

    await closeWebSocket(ws);
  });

  it('should handle concurrent messages from single client', async () => {
    const { token } = await registerDevice();
    const ws = await connectWebSocket(token);

    const messages = Array.from({ length: 5 }, (_, i) => ({
      index: i,
      data: `Message ${i}`
    }));

    const responses = await Promise.all(
      messages.map(msg => sendMessage(ws, msg))
    );

    expect(responses).toHaveLength(5);
    responses.forEach((response) => {
      expect(response.type).toBe('response');
      expect(response.data.echo.data).toBeDefined();
    });

    await closeWebSocket(ws);
  });

  it('should handle messages from multiple clients simultaneously', async () => {
    const devices = await Promise.all([
      registerDevice(),
      registerDevice(),
      registerDevice()
    ]);

    const connections = await Promise.all(
      devices.map(d => connectWebSocket(d.token))
    );

    const allMessages = connections.map((ws, i) =>
      sendMessage(ws, { clientId: i, message: `Client ${i}` })
    );

    const responses = await Promise.all(allMessages);

    expect(responses).toHaveLength(3);
    responses.forEach((response) => {
      expect(response.type).toBe('response');
      expect(response.data.echo.data).toBeDefined();
    });

    await Promise.all(connections.map(closeWebSocket));
  });
});
