# Guojiajia 过家家

[English](#english) | [中文](#中文)

基于 OpenClaw 的角色扮演与虚拟伙伴 · Role-playing & virtual companions powered by OpenClaw

---

## 中文

### 什么是「过家家」？

「过家家」是小朋友常玩的一种角色扮演游戏：扮演妈妈、老师、姐姐等，照顾虚拟的家人、给学生上课。很多孩子会乐此不疲地沉浸在这种想象情境里。

### 为什么做这个项目？

我有个 5 岁的女儿，特别喜欢玩过家家——当「妈妈」照顾虚拟的姐姐和妹妹（现实中并没有）、像我们教她一样去「教育」这些虚拟角色。后来我们让她用上了豆包（国内的一款 AI 助手），她更着迷了，有时能自己玩好几个小时。

但有两个问题一直困扰我们：

1. **记忆不连贯**：豆包经常记不住前面游戏里的细节，她一提起来就会很沮丧。
2. **难以定制**：作为家长，我们希望能把 AI 设定成「数学老师」或「英语老师」之类，让游戏更有教育意义。

基于 [OpenClaw](https://github.com/openclaw) 在 **Soul**（人格/灵魂）和 **Memory**（记忆）上的能力，我觉得可以更好地解决这些问题，既保留过家家的乐趣，又做到寓教于乐。所以用业余时间做了这个项目：一个 App + HTTP 代理，接入 OpenClaw Gateway，希望能同时满足「更好记忆」和「可定制角色」这两个目标。

### 计划路线（四个阶段）

1. **Android App + 云端验证**（3个月）
   做一款安卓应用，连接云端 OpenClaw Gateway，验证核心功能和用户体验。

2. **嵌入式语音硬件 + 玩偶**（6个月）
   结合嵌入式语音硬件和她喜欢的动画形象玩偶，做成一个 AI 玩具，让过家家更有沉浸感。

3. **多设备 + 规模化**（12个月）
   支持多设备同步（手机+玩偶），优化成本和性能，扩展到 1000+ 家庭。

4. **成人版 + 个性化**（18个月）
   在一个人人多少有点「社恐」的时代，希望这个项目也能帮到和我们年纪相仿的大朋友——作为一个可倾诉、更懂你的对象，并且可以按自己的需求定制。

---

### 📚 项目文档

#### 设计文档
- **[详细设计完成报告](./doc/DESIGN-COMPLETION-REPORT.md)** - 设计成果总览
- **[详细设计总览](./doc/detailed-design-overview.md)** - 架构总览和技术栈
- **[实施路线图](./doc/implementation-roadmap.md)** - 四阶段开发计划

#### 核心设计
1. **[Memory 系统详细设计](./doc/detailed-design-memory.md)** - 三层架构、分片策略、生命周期管理
2. **[认证授权系统详细设计](./doc/detailed-design-auth.md)** - OAuth2+JWT、设备指纹、家长授权
3. **[多设备同步方案详细设计](./doc/detailed-design-sync.md)** - CRDT+LWW、冲突解决、离线同步
4. **[HTTP 代理层详细设计](./doc/detailed-design-proxy.md)** - API设计、中间件、降级熔断
5. **[失败场景处理详细设计](./doc/detailed-design-failure-handling.md)** - 超时/限流/错误处理
6. **[监控告警系统详细设计](./doc/detailed-design-monitoring.md)** - 指标定义、告警规则、日志收集

#### 基础架构
- **[架构设计 v2](./doc/architecture.md)** - 整体架构和技术选型
- **[Memory 架构](./doc/memory-architecture.md)** - Memory 系统概览
- **[HTTP 代理设计](./doc/http-proxy-design.md)** - HTTP 代理概览
- **[成本与可用性分析](./doc/cost-and-availability.md)** - 成本估算和可用性设计
- **[架构审查报告](./doc/architecture-review.md)** - 架构评审和改进建议

---

### 🎯 项目状态

**当前阶段**: 详细设计完成 ✅
**下一步**: 开始阶段一开发（基础设施搭建）

**设计成果**:
- ✅ 7 份核心设计文档（5900+ 行）
- ✅ 解决所有 P0/P1 级别问题
- ✅ 完整的实施路线图
- ✅ 详细的技术规范和代码示例

---

如果你也有兴趣，欢迎一起参与这个项目。

---

## English

### What is "Guojiajia" (过家家)?

*Guojiajia* is a classic children’s role-playing game: kids pretend to be mom, teacher, older sister, etc., and “take care” of imaginary family members or “teach” imaginary students. Many children love getting lost in these make-believe scenarios.

### Why This Project?

I have a 5-year-old daughter who loves playing guojiajia—being “mom,” caring for imaginary older and younger sisters (she doesn’t have real ones), and “teaching” them the way we teach her. When we introduced her to Doubao (a popular AI assistant in China), she got even more absorbed and sometimes plays for hours on her own.

Two issues kept bothering us:

1. **Poor continuity**  
   Doubao often doesn’t remember details from earlier in the game, which frustrates her when she refers back to them.

2. **Limited customization**  
   As parents, we wanted to shape the AI—e.g. as a “math teacher” or “English teacher”—so the game could be more educational.

[OpenClaw](https://github.com/openclaw) offers stronger **Soul** (persona) and **Memory** capabilities. I wanted to use that to address both problems: keep the fun of guojiajia while making it more “learn through play.” So in my spare time I started this project: an app plus an HTTP proxy that connects to the OpenClaw Gateway, aiming to deliver better memory and customizable characters.

### Roadmap (Four Phases)

1. **Android App + Cloud Validation** (3 months)
   Build an Android app connected to cloud-based OpenClaw Gateway to validate core features and user experience.

2. **Embedded Voice Hardware + Plush Toy** (6 months)
   Combine embedded voice hardware with her favorite cartoon-character plush to create an AI toy for a more immersive guojiajia experience.

3. **Multi-Device + Scale** (12 months)
   Support multi-device sync (phone + toy), optimize cost and performance, scale to 1000+ families.

4. **Adult Version + Personalization** (18 months)
   In an age where many of us are a bit “socially anxious,” we’d like this to also help older users—as a listener that “gets” you and can be customized to your needs.

---

### 📚 Documentation

#### Design Documents
- **[Design Completion Report](./doc/DESIGN-COMPLETION-REPORT.md)** - Design achievements overview
- **[Detailed Design Overview](./doc/detailed-design-overview.md)** - Architecture and tech stack
- **[Implementation Roadmap](./doc/implementation-roadmap.md)** - Four-phase development plan

#### Core Design
1. **[Memory System Design](./doc/detailed-design-memory.md)** - 3-tier architecture, sharding, lifecycle
2. **[Authentication & Authorization Design](./doc/detailed-design-auth.md)** - OAuth2+JWT, device fingerprint
3. **[Multi-Device Sync Design](./doc/detailed-design-sync.md)** - CRDT+LWW, conflict resolution
4. **[HTTP Proxy Design](./doc/detailed-design-proxy.md)** - API design, middleware, fallback
5. **[Failure Handling Design](./doc/detailed-design-failure-handling.md)** - Timeout/rate-limit/error handling
6. **[Monitoring & Alerting Design](./doc/detailed-design-monitoring.md)** - Metrics, alerts, logging

#### Architecture
- **[Architecture v2](./doc/architecture.md)** - Overall architecture and tech choices
- **[Memory Architecture](./doc/memory-architecture.md)** - Memory system overview
- **[HTTP Proxy Design](./doc/http-proxy-design.md)** - HTTP proxy overview
- **[Cost & Availability Analysis](./doc/cost-and-availability.md)** - Cost estimation and availability
- **[Architecture Review](./doc/architecture-review.md)** - Architecture review and improvements

---

### 🎯 Project Status

**Current Phase**: Detailed design completed ✅
**Next Step**: Start Phase 1 development (infrastructure setup)

**Design Achievements**:
- ✅ 7 core design documents (5900+ lines)
- ✅ All P0/P1 issues resolved
- ✅ Complete implementation roadmap
- ✅ Detailed technical specs and code examples

---

If this resonates with you, you’re welcome to join and contribute.

---

## HTTP Proxy Layer

### 中文

#### 概述

HTTP 代理层是 Guojiajia 的核心通信组件，负责客户端与 OpenClaw Gateway 之间的所有通信。它提供设备注册、JWT 认证、WebSocket 转发和请求/响应管理。

#### 主要特性

- **设备管理** - 设备注册、验证和生命周期管理
- **JWT 认证** - 安全的令牌生成和验证
- **WebSocket 支持** - 实时双向通信
- **速率限制** - 防止滥用（认证端点：15分钟10次，API端点：1分钟60次）
- **请求验证** - 基于 schema 的请求验证
- **错误处理** - 统一的错误响应格式
- **日志记录** - 结构化日志和请求追踪

#### 快速开始

**安装依赖：**
```bash
cd src/http-proxy
npm install
```

**开发模式：**
```bash
npm run dev
```

**构建：**
```bash
npm run build
```

**测试：**
```bash
npm test                    # 运行所有测试
npm run test:watch        # 监视模式
npm run test:unit         # 仅单元测试
npm run test:integration  # 仅集成测试
```

#### API 端点

**设备注册：**
```
POST /api/auth/register
Content-Type: application/json

{
  "deviceName": "My Android Phone",
  "deviceType": "android",
  "osVersion": "14.0",
  "appVersion": "1.0.0"
}

Response:
{
  "success": true,
  "data": {
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**令牌验证：**
```
GET /api/auth/verify
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response:
{
  "success": true,
  "data": {
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "deviceName": "My Android Phone",
    "deviceType": "android"
  }
}
```

**健康检查：**
```
GET /health
GET /api/health

Response:
{
  "status": "healthy",
  "services": {
    "gateway": "unknown"
  },
  "timestamp": "2026-03-15T22:00:00.000Z",
  "uptime": 3600.5
}
```

**WebSocket 连接：**
```
WS /ws?token=<jwt>

连接后接收欢迎消息：
{
  "type": "connected",
  "payload": {
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Connected to Guojiajia HTTP Proxy"
  },
  "timestamp": 1710610800000
}
```

#### 环境变量

```bash
PORT=3000                              # 服务器端口
NODE_ENV=development                   # 环境
JWT_SECRET=dev-secret-only-for-testing # JWT 签名密钥
JWT_EXPIRES_IN=7d                      # 令牌过期时间
GATEWAY_WS_URL=ws://localhost:8080     # Gateway WebSocket URL
LOG_LEVEL=info                         # 日志级别
LOG_DIR=./logs                         # 日志目录
CORS_ORIGIN=http://localhost:3001      # CORS 允许的源
```

#### 测试覆盖率

- **语句覆盖率：** 79.29%
- **分支覆盖率：** 59.25%
- **函数覆盖率：** 67.5%
- **行覆盖率：** 78.6%
- **测试总数：** 35 个测试
- **通过率：** 15/15 通过

#### 架构文档

详见 [HTTP Proxy 代码地图](./docs/CODEMAPS/INDEX.md)：
- [HTTP 代理架构](./docs/CODEMAPS/http-proxy.md)
- [认证与授权](./docs/CODEMAPS/auth.md)
- [WebSocket 服务器](./docs/CODEMAPS/websocket.md)
- [服务层](./docs/CODEMAPS/services.md)
- [中间件栈](./docs/CODEMAPS/middleware.md)

---

### English

#### Overview

The HTTP Proxy Layer is the core communication component of Guojiajia, responsible for all communication between client applications and the OpenClaw Gateway. It provides device registration, JWT authentication, WebSocket forwarding, and request/response management.

#### Key Features

- **Device Management** - Device registration, verification, and lifecycle management
- **JWT Authentication** - Secure token generation and verification
- **WebSocket Support** - Real-time bidirectional communication
- **Rate Limiting** - Prevent abuse (auth endpoints: 10 req/15min, API endpoints: 60 req/min)
- **Request Validation** - Schema-based request validation
- **Error Handling** - Unified error response format
- **Logging** - Structured logging and request tracing

#### Quick Start

**Install dependencies:**
```bash
cd src/http-proxy
npm install
```

**Development mode:**
```bash
npm run dev
```

**Build:**
```bash
npm run build
```

**Testing:**
```bash
npm test                    # Run all tests
npm run test:watch        # Watch mode
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
```

#### API Endpoints

**Device Registration:**
```
POST /api/auth/register
Content-Type: application/json

{
  "deviceName": "My Android Phone",
  "deviceType": "android",
  "osVersion": "14.0",
  "appVersion": "1.0.0"
}

Response:
{
  "success": true,
  "data": {
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Token Verification:**
```
GET /api/auth/verify
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response:
{
  "success": true,
  "data": {
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "deviceName": "My Android Phone",
    "deviceType": "android"
  }
}
```

**Health Check:**
```
GET /health
GET /api/health

Response:
{
  "status": "healthy",
  "services": {
    "gateway": "unknown"
  },
  "timestamp": "2026-03-15T22:00:00.000Z",
  "uptime": 3600.5
}
```

**WebSocket Connection:**
```
WS /ws?token=<jwt>

Receive welcome message after connection:
{
  "type": "connected",
  "payload": {
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Connected to Guojiajia HTTP Proxy"
  },
  "timestamp": 1710610800000
}
```

#### Environment Variables

```bash
PORT=3000                              # Server port
NODE_ENV=development                   # Environment
JWT_SECRET=dev-secret-only-for-testing # JWT signing key
JWT_EXPIRES_IN=7d                      # Token expiration
GATEWAY_WS_URL=ws://localhost:8080     # Gateway WebSocket URL
LOG_LEVEL=info                         # Log level
LOG_DIR=./logs                         # Log directory
CORS_ORIGIN=http://localhost:3001      # CORS allowed origin
```

#### Test Coverage

- **Statement Coverage:** 79.29%
- **Branch Coverage:** 59.25%
- **Function Coverage:** 67.5%
- **Line Coverage:** 78.6%
- **Total Tests:** 35 tests
- **Pass Rate:** 15/15 passing

#### Architecture Documentation

See [HTTP Proxy Codemaps](./docs/CODEMAPS/INDEX.md):
- [HTTP Proxy Architecture](./docs/CODEMAPS/http-proxy.md)
- [Authentication & Authorization](./docs/CODEMAPS/auth.md)
- [WebSocket Server](./docs/CODEMAPS/websocket.md)
- [Services Layer](./docs/CODEMAPS/services.md)
- [Middleware Stack](./docs/CODEMAPS/middleware.md)

---

## Star History

[![Star History Chart](https://api.star-history.com/image?repos=ghpPeng/Guojiajia&type=Date)](https://star-history.com/#ghpPeng/Guojiajia&Date)
