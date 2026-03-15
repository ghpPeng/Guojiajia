/**
 * 测试工具函数
 */

import jwt from 'jsonwebtoken';

export interface TestDevice {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  osVersion: string;
}

export interface TestToken {
  token: string;
  deviceId: string;
  expiresAt: number;
}

/**
 * 创建测试设备数据
 */
export function createTestDevice(overrides?: Partial<TestDevice>): TestDevice {
  return {
    deviceId: `test-device-${Date.now()}`,
    deviceName: 'Test Device',
    deviceType: 'ios',
    osVersion: '17.0',
    ...overrides
  };
}

/**
 * 生成测试 JWT Token
 */
export function generateTestToken(deviceId: string, expiresIn: string = '24h'): TestToken {
  const secret = process.env.JWT_SECRET || 'test-secret';
  const token = jwt.sign(
    { deviceId, type: 'device' },
    secret,
    { expiresIn }
  );

  const decoded = jwt.decode(token) as any;
  return {
    token,
    deviceId,
    expiresAt: decoded.exp * 1000
  };
}

/**
 * 生成过期的 JWT Token
 */
export function generateExpiredToken(deviceId: string): string {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(
    { deviceId, type: 'device' },
    secret,
    { expiresIn: '-1h' } // 已过期
  );
}

/**
 * 生成无效的 JWT Token
 */
export function generateInvalidToken(): string {
  return 'invalid.jwt.token';
}

/**
 * 等待指定时间
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 等待条件满足
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * 创建测试消息
 */
export function createTestMessage(content: string, role: string = 'user') {
  return {
    role,
    content,
    timestamp: Date.now()
  };
}

/**
 * 验证 JWT Token
 */
export function verifyTestToken(token: string): any {
  const secret = process.env.JWT_SECRET || 'test-secret';
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}
