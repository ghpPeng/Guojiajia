/**
 * Mock Gateway 服务
 * 用于测试时模拟 OpenClaw Gateway 的行为
 */

import { Server } from 'http';
import express, { Express } from 'express';
import { WebSocketServer, WebSocket } from 'ws';

export interface MockGatewayOptions {
  port?: number;
  responseDelay?: number;
}

export class MockGateway {
  private app: Express;
  private server: Server | null = null;
  private wss: WebSocketServer | null = null;
  private port: number;
  private responseDelay: number;
  private connections: Set<WebSocket> = new Set();

  constructor(options: MockGatewayOptions = {}) {
    this.port = options.port || 8080;
    this.responseDelay = options.responseDelay || 0;
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    // 对话接口
    this.app.post('/v1/chat/completions', async (req, res) => {
      if (this.responseDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.responseDelay));
      }

      const { messages, stream } = req.body;

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 模拟流式响应
        const chunks = ['Hello', ' ', 'from', ' ', 'mock', ' ', 'gateway'];
        for (const chunk of chunks) {
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        res.json({
          id: 'mock-response-id',
          object: 'chat.completion',
          created: Date.now(),
          model: 'mock-model',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'Mock response from gateway'
            },
            finish_reason: 'stop'
          }]
        });
      }
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          // 创建 WebSocket 服务器
          this.wss = new WebSocketServer({ server: this.server! });

          this.wss.on('connection', (ws: WebSocket) => {
            this.connections.add(ws);

            ws.on('message', async (data: Buffer) => {
              if (this.responseDelay > 0) {
                await new Promise(resolve => setTimeout(resolve, this.responseDelay));
              }

              // 回显消息
              const message = data.toString();
              ws.send(JSON.stringify({
                type: 'response',
                data: `Echo: ${message}`
              }));
            });

            ws.on('close', () => {
              this.connections.delete(ws);
            });
          });

          resolve();
        });

        this.server.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    // 关闭所有 WebSocket 连接
    for (const ws of this.connections) {
      ws.close();
    }
    this.connections.clear();

    // 关闭 WebSocket 服务器
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => resolve());
      });
      this.wss = null;
    }

    // 关闭 HTTP 服务器
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.server = null;
    }
  }

  getPort(): number {
    return this.port;
  }

  getUrl(): string {
    return `http://localhost:${this.port}`;
  }

  getWsUrl(): string {
    return `ws://localhost:${this.port}`;
  }
}
