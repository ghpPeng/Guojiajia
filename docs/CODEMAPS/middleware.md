# Middleware Stack Codemap

**Last Updated:** 2026-03-15
**Entry Points:** `src/middleware/`, `src/app.ts`

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Request Processing Pipeline                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. CORS Middleware                                    │
│     ├─ Allow origins: CORS_ORIGIN env var             │
│     ├─ Methods: GET, POST, PUT, DELETE                │
│     └─ Headers: Content-Type, Authorization           │
│                                                         │
│  2. JSON Parser                                        │
│     ├─ Parse application/json                         │
│     ├─ Limit: 1MB                                     │
│     └─ Extended URL encoding                          │
│                                                         │
│  3. Logger Middleware                                  │
│     ├─ Log method, path, status                       │
│     ├─ Log timestamp                                  │
│     └─ Log response time                              │
│                                                         │
│  4. Route-Specific Middleware                          │
│     ├─ Rate Limiter (auth endpoints)                  │
│     ├─ Validator (schema validation)                  │
│     └─ Auth Middleware (protected routes)             │
│                                                         │
│  5. Error Middleware                                   │
│     ├─ Catch errors                                   │
│     ├─ Format response                                │
│     └─ Log error details                              │
│                                                         │
│  6. 404 Handler                                        │
│     └─ Return not found response                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Middleware Modules

### 1. Logger Middleware

**File:** `src/middleware/logger.middleware.ts`

**Purpose:** Log all HTTP requests and responses

**Implementation:**
```typescript
export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  });

  next();
};
```

**Coverage:** 100%

### 2. Auth Middleware

**File:** `src/middleware/auth.middleware.ts`

**Purpose:** Validate JWT tokens and attach device to request

**Implementation:**
```typescript
export const authMiddleware = (
  jwtService: JWTService,
  deviceService: DeviceService
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        res.status(401).json({ success: false, error: 'No token provided' });
        return;
      }

      const [scheme, token] = authHeader.split(' ');
      if (scheme !== 'Bearer') {
        res.status(401).json({ success: false, error: 'Invalid token format' });
        return;
      }

      const decoded = jwtService.verifyToken(token);
      const device = deviceService.getDevice(decoded.deviceId);

      if (!device) {
        res.status(401).json({ success: false, error: 'Device not found' });
        return;
      }

      deviceService.updateLastActive(device.deviceId);
      req.device = device;
      next();
    } catch (error) {
      res.status(401).json({ success: false, error: 'Invalid token' });
    }
  };
};
```

**Coverage:** 80.95%

**Error Scenarios:**
- Missing Authorization header → 401
- Invalid Bearer format → 401
- Invalid token → 401
- Device not found → 401

### 3. Rate Limit Middleware

**File:** `src/middleware/rate-limit.middleware.ts`

**Purpose:** Prevent abuse by limiting request frequency

**Auth Limiter:**
```typescript
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 requests per window
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

**API Limiter:**
```typescript
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 60,                    // 60 requests per minute
  message: {
    success: false,
    error: 'Rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

**Coverage:** 100%

**Response Headers:**
- `RateLimit-Limit`: Total requests allowed
- `RateLimit-Remaining`: Requests remaining
- `RateLimit-Reset`: Reset timestamp

### 4. Validation Middleware

**File:** `src/middleware/validator.middleware.ts`

**Purpose:** Validate request schema

**Device Registration Validation:**
```typescript
export const validateRegisterDevice = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { deviceName, deviceType, osVersion, appVersion } = req.body;

  if (!deviceName || !deviceType || !osVersion || !appVersion) {
    throw new Error('Missing required fields');
  }

  if (!['android', 'ios', 'embedded'].includes(deviceType)) {
    throw new Error('deviceType must be one of: android, ios, embedded');
  }

  next();
};
```

**Coverage:** 75%

**Validation Rules:**
- All fields required
- deviceType must be one of: android, ios, embedded
- Throws error on validation failure

### 5. Error Middleware

**File:** `src/middleware/error.middleware.ts`

**Purpose:** Catch and format errors

**Implementation:**
```typescript
export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error({
    error: err.message,
    method: req.method,
    path: req.path,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
```

**Coverage:** 85.71%

**Error Response Format:**
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2026-03-15T22:00:00Z"
}
```

## Middleware Execution Order

**In Express App:**
```typescript
app.use(cors({ ... }));                    // 1. CORS
app.use(express.json({ limit: '1mb' }));   // 2. JSON Parser
app.use(loggerMiddleware);                  // 3. Logger

app.use('/health', healthRoutes);           // Routes
app.use('/api', apiRoutes);                 // Routes

app.use((_req, res) => { ... });            // 4. 404 Handler
app.use(errorMiddleware);                   // 5. Error Handler
```

**Per-Route Middleware:**
```typescript
// Auth routes
router.post('/register', authRateLimiter, validateRegisterDevice, authController.register);
router.get('/verify', authMiddleware(jwtService, deviceService), authController.verify);
```

## Test Coverage

| Middleware | Coverage | Tests |
|-----------|----------|-------|
| Logger | 100% | Implicit in all tests |
| Auth | 80.95% | auth.middleware.test.ts |
| Rate Limit | 100% | Implicit in integration tests |
| Validator | 75% | Implicit in auth.routes.test.ts |
| Error | 85.71% | Implicit in integration tests |

## Related Areas

- [HTTP Proxy Architecture](./http-proxy.md)
- [Authentication & Authorization](./auth.md)
- [Services Layer](./services.md)
