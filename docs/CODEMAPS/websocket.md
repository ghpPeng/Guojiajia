# WebSocket Server Codemap

**Last Updated:** 2026-03-15
**Entry Points:** `src/websocket/server.ts`, `src/index.ts`

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              WebSocket Connection Lifecycle             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Client connects: WS /ws?token=<jwt>                │
│     ↓                                                   │
│  2. Extract token from query params                    │
│     ↓                                                   │
│  3. JWT Service.verifyToken()                          │
│     ↓                                                   │
│  4. Device Service.getDevice()                         │
│     ↓                                                   │
│  5. Store in clients Map<deviceId, WebSocket>          │
│     ↓                                                   │
│  6. Send welcome message                               │
│     ↓                                                   │
│  7. Listen for messages                                │
│     ├─ On message: handleMessage()                     │
│     ├─ On close: handleClose()                         │
│     └─ On error: handleError()                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Key Modules

| Module | Purpose | Key Methods |
|--------|---------|-------------|
| `websocket/server.ts` | WebSocket server | initialize(), handleConnection(), handleMessage() |
| `index.ts` | Server bootstrap | Creates HTTP server and WebSocket server |

## Connection Flow

**Step 1: Client Initiates Connection**
```
WS /ws?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Step 2: Server Validates Token**
```typescript
// Extract token from query string
const url = new URL(req.url!, `http://${req.headers.host}`);
const token = url.searchParams.get('token');

// Verify token
const decoded = this.jwtService.verifyToken(token);
const device = this.deviceService.getDevice(decoded.deviceId);
```

**Step 3: Store Client Connection**
```typescript
this.clients.set(device.deviceId, ws);
this.deviceService.updateLastActive(device.deviceId);
```

**Step 4: Send Welcome Message**
```json
{
  "type": "connected",
  "payload": {
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Connected to Guojiajia HTTP Proxy"
  },
  "timestamp": 1710610800000
}
```

## Message Handling

**Message Format:**
```typescript
interface WSMessage {
  type: 'chat' | 'ping' | 'pong' | 'error';
  payload: any;
  timestamp: number;
}
```

**Message Flow:**
```
Client sends message
    ↓
handleMessage(deviceId, data)
    ↓
Parse JSON
    ↓
Update lastActiveAt
    ↓
forwardToGateway(deviceId, message)
    ↓
Send response back to client
```

**Example Chat Message:**
```json
{
  "type": "chat",
  "payload": {
    "conversationId": "conv-123",
    "message": "Hello, how are you?"
  },
  "timestamp": 1710610800000
}
```

## Connection Management

**Client Storage:**
```typescript
private clients: Map<string, WebSocket>;
// Key: deviceId
// Value: WebSocket connection
```

**Public Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `broadcast(message)` | Send to all connected clients | void |
| `sendToDevice(deviceId, message)` | Send to specific device | boolean |
| `getConnectedDevices()` | List all connected device IDs | string[] |
| `close()` | Gracefully close all connections | void |

## Error Handling

**Connection Rejection Scenarios:**

1. **No Token Provided**
   - Close code: 1008
   - Message: "No token provided"

2. **Invalid Token**
   - Close code: 1008
   - Message: "Authentication failed"

3. **Device Not Found**
   - Close code: 1008
   - Message: "Device not found"

4. **Message Parsing Error**
   - Log error
   - Continue listening

5. **WebSocket Error**
   - Log error
   - Remove from clients map

## Gateway Integration (TODO)

**Current Implementation:**
- Messages are echoed back to client
- Placeholder for actual Gateway forwarding

**Future Implementation:**
```typescript
private forwardToGateway(deviceId: string, message: any): void {
  // TODO: Implement actual Gateway forwarding
  // 1. Connect to Gateway WebSocket
  // 2. Forward message
  // 3. Receive response
  // 4. Send response back to client
}
```

## Lifecycle Events

**On Connection:**
- Extract and verify token
- Get device info
- Store client reference
- Update lastActiveAt
- Send welcome message
- Attach event listeners

**On Message:**
- Parse JSON
- Update lastActiveAt
- Forward to Gateway
- Send response

**On Close:**
- Remove from clients map
- Log disconnection

**On Error:**
- Log error details
- Remove from clients map

## Test Coverage

**Unit Tests:**
- `websocket.server.test.ts` - Connection, message handling, error scenarios

**Coverage:**
- WebSocket Server: Partial (connection logic tested)

## Related Areas

- [HTTP Proxy Architecture](./http-proxy.md)
- [Authentication & Authorization](./auth.md)
- [Services Layer](./services.md)
