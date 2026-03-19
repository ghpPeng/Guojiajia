import request from 'supertest';
import WebSocket from 'ws';
import { app } from '../../../src/app';

export interface DeviceRegistration {
  deviceName: string;
  token: string;
}

export function getTestPort(): number {
  return parseInt(process.env.PORT || '3000', 10);
}

export async function registerDevice(deviceName: string = `device-${Date.now()}`): Promise<DeviceRegistration> {
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      deviceName,
      deviceType: 'embedded',
      osVersion: '1.0.0',
      appVersion: '1.0.0'
    })
    .expect(200);

  return {
    deviceName,
    token: response.body.data?.token || response.body.token
  };
}

export function connectWebSocket(token: string, port?: number): Promise<WebSocket> {
  const wsPort = port || getTestPort();
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${wsPort}/ws?token=${encodeURIComponent(token)}`);

    const timer = setTimeout(() => {
      ws.removeAllListeners();
      ws.close();
      reject(new Error('WebSocket connection timeout'));
    }, 5000);

    ws.on('open', () => {
      // Wait briefly to see if server immediately closes (auth rejection)
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          clearTimeout(timer);
          resolve(ws);
        }
      }, 100);
    });

    ws.on('close', (code) => {
      clearTimeout(timer);
      if (ws.readyState !== WebSocket.OPEN) {
        reject(new Error(`WebSocket closed with code ${code}`));
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function sendMessage(ws: WebSocket, data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const message = { id: msgId, type: 'request', data };

    const timeout = setTimeout(() => {
      ws.off('message', handler);
      reject(new Error('Message response timeout'));
    }, 5000);

    const handler = (rawData: WebSocket.Data) => {
      const response = JSON.parse(rawData.toString());
      if (response.type === 'response') {
        clearTimeout(timeout);
        ws.off('message', handler);
        // Normalize: server sends payload.echo, tests expect data.echo
        if (response.payload && !response.data) {
          response.data = response.payload;
        }
        resolve(response);
      }
    };

    ws.on('message', handler);
    ws.send(JSON.stringify(message));
  });
}

export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Condition timeout');
}

export function closeWebSocket(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.CLOSED) {
      resolve();
      return;
    }
    if (ws.readyState === WebSocket.CLOSING) {
      const check = setInterval(() => {
        if (ws.readyState === WebSocket.CLOSED) {
          clearInterval(check);
          resolve();
        }
      }, 50);
      setTimeout(() => { clearInterval(check); resolve(); }, 2000);
      return;
    }
    ws.removeAllListeners();
    ws.once('close', () => resolve());
    ws.close();
    setTimeout(() => resolve(), 2000);
  });
}
