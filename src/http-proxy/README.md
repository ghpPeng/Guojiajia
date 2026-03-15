# HTTP Proxy Layer for Guojiajia

HTTP 代理层是 Guojiajia 项目的核心组件，负责设备认证、请求路由和 WebSocket 转发。

## 功能特性

- ✅ 设备注册和认证（JWT）
- ✅ RESTful API 接口
- ✅ WebSocket 转发到 OpenClaw Gateway
- ✅ 访问日志和错误日志
- ✅ 健康检查端点
- ✅ 完整的错误处理

## 技术栈

- Node.js 18+
- TypeScript
- Express
- WebSocket (ws)
- JWT (jsonwebtoken)
- Winston (日志)

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 到 `.env` 并修改配置：

```bash
cp .env.example .env
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 生产模式

```bash
npm start
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 监听模式
npm run test:watch
```

## API 文档

### 健康检查

```
GET /health
```

响应：
```json
{
  "status": "healthy",
  "timestamp": "2026-03-15T10:00:00.000Z",
  "uptime": 123.456
}
```

### 设备注册

```
POST /api/auth/register
```

请求体：
```json
{
  "deviceName": "My Phone",
  "deviceType": "android",
  "osVersion": "13.0",
  "appVersion": "1.0.0"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "deviceId": "uuid-here",
    "token": "jwt-token-here"
  }
}
```

### 验证 Token

```
GET /api/auth/verify
Authorization: Bearer <token>
```

响应：
```json
{
  "success": true,
  "data": {
    "deviceId": "uuid-here",
    "deviceName": "My Phone",
    "deviceType": "android"
  }
}
```

## 项目结构

```
src/
├── config/           # 配置管理
├── middleware/       # Express 中间件
├── routes/           # 路由定义
├── controllers/      # 控制器
├── services/         # 业务逻辑
├── models/           # 数据模型和类型
├── utils/            # 工具函数
├── websocket/        # WebSocket 服务
├── app.ts            # Express 应用
└── index.ts          # 入口文件

tests/
├── unit/             # 单元测试
├── integration/      # 集成测试
├── helpers/          # 测试辅助
└── setup.ts          # 测试配置
```

## 测试覆盖率

目标覆盖率：>80%

当前覆盖率：运行 `npm test` 查看

## 日志

日志文件位于 `./logs/` 目录：

- `error-YYYY-MM-DD.log` - 错误日志
- `combined-YYYY-MM-DD.log` - 所有日志

日志保留 14 天，单个文件最大 20MB。

## 开发指南

### 添加新的 API 端点

1. 在 `src/routes/` 创建路由文件
2. 在 `src/controllers/` 创建控制器
3. 在 `src/services/` 实现业务逻辑
4. 在 `tests/` 添加测试用例

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 测试覆盖率 >80%

## 部署

### Docker 部署（待实现）

```bash
docker build -t guojiajia-http-proxy .
docker run -p 3000:3000 --env-file .env guojiajia-http-proxy
```

### PM2 部署

```bash
npm run build
pm2 start dist/index.js --name guojiajia-proxy
```

## 故障排查

### 端口被占用

修改 `.env` 中的 `PORT` 配置。

### JWT 验证失败

确保 `JWT_SECRET` 在所有实例中一致。

### 日志文件过大

日志会自动轮转，保留 14 天。可以修改 `src/utils/logger.ts` 中的配置。

## 许可证

MIT
