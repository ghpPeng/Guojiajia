# Services Layer Codemap

**Last Updated:** 2026-03-15
**Entry Points:** `src/services/jwt.service.ts`, `src/services/device.service.ts`

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Services Layer                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │         JWT Service                             │   │
│  │  - generateToken(payload)                       │   │
│  │  - verifyToken(token)                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Device Service                          │   │
│  │  - registerDevice(data)                         │   │
│  │  - getDevice(deviceId)                          │   │
│  │  - updateLastActive(deviceId)                   │   │
│  │  - getAllDevices()                              │   │
│  │  - deleteDevice(deviceId)                       │   │
│  └─────────────────────────────────────────────────┘   │
│           ↓                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │    Device Storage Service                       │   │
│  │  - loadDevices()                                │   │
│  │  - saveDevices(devices)                         │   │
│  └─────────────────────────────────────────────────┘   │
│           ↓                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │    File System (JSON persistence)               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## JWT Service

**Purpose:** Token generation and verification

**Class:** `JWTService`

**Constructor:**
```typescript
constructor() {
  this.secret = appConfig.jwt.secret;
  this.expiresIn = appConfig.jwt.expiresIn;
}
```

**Methods:**

| Method | Parameters | Returns | Purpose |
|--------|-----------|---------|---------|
| `generateToken()` | `payload: JWTPayload` | `string` | Create signed JWT token |
| `verifyToken()` | `token: string` | `JWTPayload` | Verify and decode token |

**Token Generation:**
```typescript
generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, this.secret, {
    expiresIn: this.expiresIn,
  } as jwt.SignOptions);
}
```

**Token Verification:**
```typescript
verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, this.secret) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

**Configuration:**
- Algorithm: HS256
- Secret: From `JWT_SECRET` env var
- Expiration: From `JWT_EXPIRES_IN` env var (default: 7d)

## Device Service

**Purpose:** Device lifecycle management

**Class:** `DeviceService`

**Constructor:**
```typescript
constructor(storageDir?: string) {
  this.devices = new Map();
  this.storage = new DeviceStorageService(storageDir);
  this.loadDevices();
}
```

**Methods:**

| Method | Parameters | Returns | Purpose |
|--------|-----------|---------|---------|
| `registerDevice()` | `data: RegisterDeviceRequest` | `Promise<Device>` | Create new device |
| `getDevice()` | `deviceId: string` | `Device \| null` | Retrieve device by ID |
| `updateLastActive()` | `deviceId: string` | `Promise<void>` | Update activity timestamp |
| `getAllDevices()` | - | `Device[]` | Get all registered devices |
| `deleteDevice()` | `deviceId: string` | `Promise<boolean>` | Remove device |

**Device Registration:**
```typescript
async registerDevice(data: RegisterDeviceRequest): Promise<Device> {
  const device: Device = {
    deviceId: uuidv4(),
    deviceName: data.deviceName,
    deviceType: data.deviceType,
    osVersion: data.osVersion,
    appVersion: data.appVersion,
    createdAt: new Date(),
    lastActiveAt: new Date(),
  };

  this.devices.set(device.deviceId, device);
  await this.persist();
  return device;
}
```

**Device Retrieval:**
```typescript
getDevice(deviceId: string): Device | null {
  return this.devices.get(deviceId) || null;
}
```

**Update Activity:**
```typescript
async updateLastActive(deviceId: string): Promise<void> {
  const device = this.devices.get(deviceId);
  if (device) {
    device.lastActiveAt = new Date();
    await this.persist();
  }
}
```

## Device Storage Service

**Purpose:** Persistent device data storage

**Class:** `DeviceStorageService`

**Storage Location:**
- Default: `./devices.json`
- Configurable via constructor parameter

**Methods:**

| Method | Parameters | Returns | Purpose |
|--------|-----------|---------|---------|
| `loadDevices()` | - | `Promise<Map<string, Device>>` | Load from file |
| `saveDevices()` | `devices: Map<string, Device>` | `Promise<void>` | Save to file |

**File Format:**
```json
{
  "550e8400-e29b-41d4-a716-446655440000": {
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "deviceName": "My Android Phone",
    "deviceType": "android",
    "osVersion": "14.0",
    "appVersion": "1.0.0",
    "createdAt": "2026-03-15T22:00:00.000Z",
    "lastActiveAt": "2026-03-15T22:05:00.000Z"
  }
}
```

## Data Flow

**Registration Flow:**
```
POST /api/auth/register
    ↓
AuthController.register()
    ↓
DeviceService.registerDevice()
    ├─ Generate UUID
    ├─ Create Device object
    ├─ Store in Map
    └─ Call persist()
        ↓
        DeviceStorageService.saveDevices()
        ↓
        Write to devices.json
    ↓
JWTService.generateToken()
    ↓
Return { deviceId, token }
```

**Verification Flow:**
```
GET /api/auth/verify + Bearer Token
    ↓
AuthMiddleware
    ↓
JWTService.verifyToken()
    ↓
DeviceService.getDevice()
    ├─ Lookup in Map
    └─ Return Device or null
    ↓
DeviceService.updateLastActive()
    ├─ Update timestamp
    └─ Call persist()
        ↓
        DeviceStorageService.saveDevices()
    ↓
AuthController.verify()
    ↓
Return device info
```

## Error Handling

**JWT Service Errors:**
- Invalid token format
- Expired token
- Invalid signature
- Malformed payload

**Device Service Errors:**
- Device not found (returns null)
- Storage write failures
- File system errors

## Test Coverage

**Unit Tests:**
- `jwt.service.test.ts` - Token generation/verification (100% coverage)
- `device.service.test.ts` - Device lifecycle (77.27% coverage)

**Test Scenarios:**
- Token generation with valid payload
- Token verification with valid/invalid tokens
- Device registration
- Device retrieval
- Activity timestamp updates
- Device deletion

## Related Areas

- [Authentication & Authorization](./auth.md)
- [HTTP Proxy Architecture](./http-proxy.md)
- [WebSocket Server](./websocket.md)
