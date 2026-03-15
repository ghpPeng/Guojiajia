# Guojiajia HTTP Proxy - 快速开始指南

## 项目概述

HTTP 代理层是 Guojiajia 项目的入口，负责：
- 设备认证（JWT）
- WebSocket 连接管理
- 请求转发到 OpenClaw Gateway
- 访问日志和错误日志

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，修改必要的配置
```

### 3. 启动开发服务器

```bash
npm run dev
# 或使用启动脚本
./start-dev.sh
```

服务器将在 http://localhost:3000 启动。

## API 测试

### 1. 健康检查

```bash
curl http://localhost:3000/health
```

### 2. 注册设备

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "deviceName": "My Phone",
    "deviceType": "android",
    "osVersion": "13.0",
    "appVersion": "1.0.0"
  }'
```

响应示例：
```json
{
  "success": true,
  "data": {
    "deviceId": "abc-123-def",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. 验证 Token

```bash
TOKEN="your-token-here"
curl http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer $TOKEN"
```

### 4. WebSocket 连接

使用 wscat 或浏览器测试：

```bash
# 安装 wscat
npm install -g wscat

# 连接 WebSocket
TOKEN="your-token-here"
wscat -c "ws://localhost:3000/ws?token=$TOKEN"
```

连接成功后，你会收到欢迎消息：
```json
{
  "type": "connected",
  "payload": {
    "deviceId": "abc-123-def",
    "message": "Connected to Guojiajia HTTP Proxy"
  },
  "timestamp": 1710489600000
}
```

发送消息：
```json
{"type": "chat", "payload": {"message": "Hello"}}
```

## 运行测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 查看覆盖率
npm test -- --coverage
```

## 项目结构

```
src/
├── config/              # 配置管理
│   └── index.ts         # 环境变量配置
├── middleware/          # Express 中间件
│   ├── auth.middleware.ts       # JWT 认证
│   ├── error.middleware.ts      # 错误处理
│   ├── logger.middleware.ts     # 访问日志
│   └── validator.middleware.ts  # 请求验证
├── routes/              # 路由定义
│   ├── auth.routes.ts   # 认证路由
│   ├── chat.routes.ts   # 对话路由
│   ├── health.routes.ts # 健康检查
│   └── index.ts         # 路由汇总
├── controllers/         # 控制器
│   ├── auth.controller.ts
│   └── chat.controller.ts
├── services/            # 业务逻辑
│   ├── jwt.service.ts   # JWT 服务
│   └── device.service.ts # 设备管理
├── models/              # 数据模型
│   └── types.ts         # TypeScript 类型
├── utils/               # 工具函数
│   └── logger.ts        # Winston 日志
├── websocket/           # WebSocket 服务
│   └── server.ts        # WebSocket 服务器
├── app.ts               # Express 应用
└── index.ts             # 入口文件
```

## 开发指南

### 添加新的 API 端点

1. 在 `src/routes/` 创建路由文件
2. 在 `src/controllers/` 创建控制器
3. 在 `src/services/` 实现业务逻辑
4. 在 `tests/` 添加测试

### 代码规范

- 使用 TypeScript 严格模式
- 所有函数必须有类型注解
- 测试覆盖率 >80%
- 使用 async/await 处理异步操作

## 常见问题

### Q: 端口被占用怎么办？
A: 修改 `.env` 文件中的 `PORT` 配置。

### Q: JWT 验证失败？
A: 确保 `JWT_SECRET` 在所有实例中一致。

### Q: WebSocket 连接失败？
A: 检查 token 是否有效，确保使用正确的 URL 格式。

## 下一步

- [ ] 实现 Gateway 转发逻辑
- [ ] 添加 Rate Limiting
- [ ] 实现内容过滤
- [ ] 添加 Prometheus 监控
- [ ] 实现 Redis 存储

## 许可证

MIT
