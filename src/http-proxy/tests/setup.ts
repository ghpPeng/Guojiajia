/**
 * 测试环境配置
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-signing';
process.env.JWT_EXPIRES_IN = '24h';
process.env.GATEWAY_URL = 'http://localhost:8080';
process.env.LOG_LEVEL = 'error'; // 测试时减少日志输出

// 全局测试超时
jest.setTimeout(10000);

// 清理定时器
afterEach(() => {
  jest.clearAllTimers();
});

// 全局错误处理
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in tests:', reason);
});
