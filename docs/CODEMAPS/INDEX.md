# Guojiajia HTTP Proxy - Codemap Index

**Last Updated:** 2026-03-15

This directory contains architectural maps and module documentation for the Guojiajia HTTP Proxy layer.

## Overview

The HTTP Proxy is the core communication layer between client applications and the OpenClaw Gateway. It handles device registration, JWT authentication, WebSocket forwarding, and request/response management.

**Key Metrics:**
- 35 tests (15 passing, 6 test suites)
- 79.29% statement coverage
- 6 test files covering unit and integration scenarios
- TypeScript with strict type checking

## Codemaps

### 1. [HTTP Proxy Architecture](./http-proxy.md)
Core proxy layer structure, middleware stack, and request flow.

**Covers:**
- Application bootstrap and configuration
- Express middleware pipeline
- Route organization
- Error handling strategy

### 2. [Authentication & Authorization](./auth.md)
Device registration, JWT token management, and authentication middleware.

**Covers:**
- Device registration flow
- JWT token generation and verification
- Auth middleware implementation
- Token validation in WebSocket connections

### 3. [WebSocket Server](./websocket.md)
Real-time bidirectional communication with clients.

**Covers:**
- WebSocket connection lifecycle
- Message handling and forwarding
- Client connection management
- Gateway integration points

### 4. [Services Layer](./services.md)
Business logic and data persistence.

**Covers:**
- JWT service (token operations)
- Device service (device lifecycle)
- Device storage service (persistence)

### 5. [Middleware Stack](./middleware.md)
Request processing pipeline and cross-cutting concerns.

**Covers:**
- Authentication middleware
- Error handling middleware
- Logger middleware
- Rate limiting middleware
- Validation middleware

## Directory Structure

```
src/http-proxy/
├── src/
│   ├── app.ts                 # Express app setup
│   ├── index.ts               # Server bootstrap
│   ├── config/
│   │   └── index.ts           # Configuration management
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   └── chat.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── logger.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── validator.middleware.ts
│   ├── models/
│   │   └── types.ts           # TypeScript interfaces
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── chat.routes.ts
│   │   ├── health.routes.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── device.service.ts
│   │   ├── device-storage.service.ts
│   │   └── jwt.service.ts
│   ├── utils/
│   │   └── logger.ts
│   └── websocket/
│       └── server.ts
├── tests/
│   ├── unit/
│   │   ├── auth.middleware.test.ts
│   │   ├── device.service.test.ts
│   │   ├── jwt.service.test.ts
│   │   └── websocket.server.test.ts
│   ├── integration/
│   │   ├── auth.routes.test.ts
│   │   └── health.routes.test.ts
│   ├── helpers/
│   │   ├── mock-gateway.ts
│   │   └── test-utils.ts
│   └── setup.ts
└── jest.config.js
```

## Key Technologies

- **Framework:** Express.js 4.18.3
- **Language:** TypeScript 5.3.3
- **Authentication:** JWT (jsonwebtoken 9.0.2)
- **Real-time:** WebSocket (ws 8.16.0)
- **Logging:** Winston 3.11.0
- **Testing:** Jest 29.7.0 + ts-jest
- **Rate Limiting:** express-rate-limit

## Entry Points

- **HTTP Server:** `src/index.ts` - Main server bootstrap
- **Express App:** `src/app.ts` - Middleware and route setup
- **WebSocket:** `src/websocket/server.ts` - Real-time communication
- **Routes:** `src/routes/index.ts` - API endpoint definitions

## Test Coverage Summary

| Category | Coverage |
|----------|----------|
| Statements | 79.29% |
| Branches | 59.25% |
| Functions | 67.5% |
| Lines | 78.6% |

**Test Suites:**
- 3 passed, 3 failed (type errors in device.service tests)
- 15 tests passing
- Unit tests: 4 files
- Integration tests: 2 files

## Related Documentation

- [Detailed Design - HTTP Proxy](../detailed-design-proxy.md)
- [Implementation Roadmap](../implementation-roadmap.md)
- [Architecture Overview](../detailed-design-overview.md)
