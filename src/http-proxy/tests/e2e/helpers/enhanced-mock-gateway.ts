import WebSocket from 'ws';
import http from 'http';

interface Message {
  id: string;
  type: string;
  data: any;
}

export class EnhancedMockGateway {
  private wss: WebSocket.Server | null = null;
  private server: http.Server | null = null;
  private port: number;
  private messageHistory: Message[] = [];
  private connections: Set<WebSocket> = new Set();
  private responseDelay: number = 0;
  private shouldFailNext: boolean = false;

  constructor(port: number = 8081) {
    this.port = port;
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer();
      this.wss = new WebSocket.Server({ server: this.server });

      this.wss.on('connection', (ws: WebSocket) => {
        this.connections.add(ws);

        ws.on('message', async (data: WebSocket.Data) => {
          const message = JSON.parse(data.toString()) as Message;
          this.messageHistory.push(message);

          if (this.responseDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.responseDelay));
          }

          if (this.shouldFailNext) {
            this.shouldFailNext = false;
            ws.close(1011, 'Simulated error');
            return;
          }

          const response = {
            id: message.id,
            type: 'response',
            data: { echo: message.data, timestamp: Date.now() }
          };

          ws.send(JSON.stringify(response));
        });

        ws.on('close', () => {
          this.connections.delete(ws);
        });
      });

      this.server.listen(this.port, () => resolve());
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.connections.forEach(ws => ws.close());
      this.wss?.close();
      this.server?.close(() => resolve());
    });
  }

  setResponseDelay(ms: number): void {
    this.responseDelay = ms;
  }

  injectError(): void {
    this.shouldFailNext = true;
  }

  getMessageHistory(): Message[] {
    return [...this.messageHistory];
  }

  clearHistory(): void {
    this.messageHistory = [];
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}
