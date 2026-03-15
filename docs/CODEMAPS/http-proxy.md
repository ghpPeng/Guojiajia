# HTTP Proxy Architecture Codemap

**Last Updated:** 2026-03-15
**Entry Points:** `src/index.ts`, `src/app.ts`

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│              (Android, iOS, Embedded Devices)                │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    HTTP/REST        WebSocket         Health
    (REST API)       (Real-time)       (Status)
        │                │                │
┌───────▼────────────────▼────────────────▼──────────────────┐
│                    Express Application                      │
├──────────────────────────────────────────────────────────────┤
│  CORS Middleware │ JSON Parser │ Logger │ Error Handler    │
├──────────────────────────────────────────────────────────────┤
│                      Route Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Routes  │  │ Chat Routes  │  │Health Routes │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├──────────────────────────────────────────────────────────────┤
│                   Middleware Pipeline                        │
│  Auth │ Validation │ Rate Limit │ Error Handling │ Logger   │
├──────────────────────────────────────────────────────────────┤
│                    Service Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ JWT Service  │  │Device Service│  │ Chat Service │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├──────────────────────────────────────────────────────────────┤
│                  WebSocket Server                            │
│  Connection Management │ Message Routing │ Gateway Forward  │
└───────┬────────────────────────────────────────────────────┬─┘
        │                                                      │
        └──────────────────┬───────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │  OpenClaw Gateway   │
                │  (WebSocket/HTTP)   │
                └─────────────────────┘
```

## Key Modules

| Module | Purpose | Exports | Dependencies |
|--------|---------|---------|--------------|
| `app.ts` | Express app setup, middleware configuration | `app` | express, cors, middleware |
| `index.ts` | Server bootstrap, HTTP/WebSocket initialization | `server`, `wsServer` | app, config, logger |
| `config/index.ts` | Environment-based configuration | `appConfig` | dotenv |
| `routes/index.ts` | Route aggregation and mounting | `apiRoutes`, `healthRoutes` | auth, chat, health routes |
| `websocket/server.ts` | WebSocket connection management | `WebSocketServer` | ws, jwt, device services |

## Request Flow

### 1. Device Registration Flow
```
POST /api/auth/register
    ↓
Rate Limit Middleware (10 req/15min)
    ↓
Validation Middleware (validateRegisterDevice)
    ↓
Auth Controller.register()
    ↓
Device Service.registerDevice()
    ↓
Device Storage Service.saveDevices()
    ↓
JWT Service.generateToken()
    ↓
Response: { deviceId, token }
```

### 2. Token Verification Flow
```
GET /api/auth/verify + Bearer Token
    ↓
Auth Middleware
    ↓
JWT Service.verifyToken()
    ↓
Device Service.getDevice()
    ↓
Update lastActiveAt
    ↓
Attach device to request
    ↓
Auth Controller.verify()
    ↓
Response: { deviceId, deviceName, deviceType }
```

### 3. WebSocket Connection Flow
```
WS /ws?token=<jwt>
    ↓
WebSocket Server.handleConnection()
    ↓
Extract token from query params
    ↓
JWT Service.verifyToken()
    ↓
Device Service.getDevice()
    ↓
Store client in Map<deviceId, WebSocket>
    ↓
Send welcome message
    ↓
Listen for messages
    ↓
Forward to Gateway (TODO)
```

## Middleware Pipeline

**Order of Execution:**

1. **CORS Middleware** - Cross-origin request handling
2. **JSON Parser** - Parse request body (1MB limit)
3. **Logger Middleware** - Log all requests
4. **Route-specific Middleware:**
   - Rate Limiter (auth endpoints)
   - Validation Middleware (request schema)
   - Auth Middleware (protected routes)
5. **Error Middleware** - Catch and format errors
6. **404 Handler** - Not found responses

## Configuration

**Environment Variables:**

```
PORT=3000                          # Server port
NODE_ENV=development               # Environment
JWT_SECRET=dev-secret-only-for-testing  # JWT signing key
JWT_EXPIRES_IN=7d                  # Token expiration
GATEWAY_WS_URL=ws://localhost:8080 # Gateway WebSocket URL
LOG_LEVEL=info                     # Logging level
LOG_DIR=./logs                     # Log directory
CORS_ORIGIN=http://localhost:3001  # CORS allowed origin
```

## Error Handling Strategy

**Error Classes:**
- `AppError` - Base error class (statusCode, message, isOperational)
- `AuthenticationError` - 401 errors
- `ValidationError` - 400 errors
- `NotFoundError` - 404 errors

**Error Response Format:**
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2026-03-15T22:00:00Z"
}
```

## External Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | 4.18.3 | HTTP server framework |
| cors | latest | Cross-origin resource sharing |
| jsonwebtoken | 9.0.2 | JWT token generation/verification |
| ws | 8.16.0 | WebSocket server |
| winston | 3.11.0 | Structured logging |
| express-rate-limit | latest | Rate limiting middleware |
| dotenv | latest | Environment variable loading |

## Related Areas

- [Authentication & Authorization](./auth.md)
- [WebSocket Server](./websocket.md)
- [Services Layer](./services.md)
- [Middleware Stack](./middleware.md)
