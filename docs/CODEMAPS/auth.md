# Authentication & Authorization Codemap

**Last Updated:** 2026-03-15
**Entry Points:** `src/routes/auth.routes.ts`, `src/middleware/auth.middleware.ts`

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│              Device Registration & Auth                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  POST /api/auth/register                                │
│    ├─ Rate Limiter (10 req/15min)                       │
│    ├─ Validator (schema validation)                     │
│    └─ Auth Controller                                   │
│         ├─ Device Service.registerDevice()              │
│         ├─ JWT Service.generateToken()                  │
│         └─ Response: { deviceId, token }                │
│                                                          │
│  GET /api/auth/verify                                   │
│    ├─ Auth Middleware                                   │
│    │   ├─ Extract Bearer token                          │
│    │   ├─ JWT Service.verifyToken()                     │
│    │   ├─ Device Service.getDevice()                    │
│    │   └─ Attach device to request                      │
│    └─ Auth Controller                                   │
│         └─ Response: { deviceId, deviceName, type }     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Key Modules

| Module | Purpose | Key Methods |
|--------|---------|-------------|
| `auth.routes.ts` | Route definitions | POST /register, GET /verify |
| `auth.controller.ts` | Request handlers | register(), verify() |
| `auth.middleware.ts` | Token validation | authMiddleware() |
| `jwt.service.ts` | Token operations | generateToken(), verifyToken() |
| `device.service.ts` | Device lifecycle | registerDevice(), getDevice() |
| `validator.middleware.ts` | Schema validation | validateRegisterDevice() |
| `rate-limit.middleware.ts` | Rate limiting | authRateLimiter |

## Device Registration

**Request:**
```json
POST /api/auth/register
{
  "deviceName": "My Android Phone",
  "deviceType": "android",
  "osVersion": "14.0",
  "appVersion": "1.0.0"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "deviceType must be one of: android, ios, embedded"
}
```

## Token Verification

**Request:**
```
GET /api/auth/verify
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "deviceName": "My Android Phone",
    "deviceType": "android"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Invalid token"
}
```

## JWT Token Structure

**Payload:**
```typescript
interface JWTPayload {
  deviceId: string;      // Unique device identifier
  deviceType: string;    // 'android' | 'ios' | 'embedded'
  iat?: number;          // Issued at (Unix timestamp)
  exp?: number;          // Expiration (Unix timestamp)
}
```

**Configuration:**
- Secret: `JWT_SECRET` environment variable
- Expiration: `JWT_EXPIRES_IN` (default: 7 days)
- Algorithm: HS256

## Device Model

```typescript
interface Device {
  deviceId: string;        // UUID v4
  deviceName: string;      // User-friendly name
  deviceType: 'android' | 'ios' | 'embedded';
  osVersion: string;       // OS version
  appVersion: string;      // App version
  createdAt: Date;         // Registration timestamp
  lastActiveAt: Date;      // Last activity timestamp
}
```

## Rate Limiting

**Auth Endpoints:**
- Window: 15 minutes
- Limit: 10 requests per window
- Response: 429 Too Many Requests

**API Endpoints:**
- Window: 1 minute
- Limit: 60 requests per minute
- Response: 429 Too Many Requests

## Validation Rules

**Device Registration:**
- `deviceName`: Required, string
- `deviceType`: Required, one of: 'android', 'ios', 'embedded'
- `osVersion`: Required, string
- `appVersion`: Required, string

## Error Codes

| Code | Status | Message |
|------|--------|---------|
| 400 | Bad Request | Validation failed |
| 401 | Unauthorized | Invalid/missing token |
| 404 | Not Found | Device not found |
| 429 | Too Many Requests | Rate limit exceeded |

## Test Coverage

**Unit Tests:**
- `jwt.service.test.ts` - Token generation/verification
- `device.service.test.ts` - Device lifecycle operations
- `auth.middleware.test.ts` - Token validation middleware

**Integration Tests:**
- `auth.routes.test.ts` - Full registration and verification flows

**Coverage:**
- JWT Service: 100%
- Auth Controller: 100%
- Auth Middleware: 80.95%
- Device Service: 77.27%

## Related Areas

- [HTTP Proxy Architecture](./http-proxy.md)
- [WebSocket Server](./websocket.md)
- [Services Layer](./services.md)
