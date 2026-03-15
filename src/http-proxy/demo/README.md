# HTTP Proxy E2E Test Demo

## Overview
This demo demonstrates the complete end-to-end flow of the HTTP Proxy layer with security fixes applied.

## Security Fixes Applied

### 1. JWT Secret Security ✓
- **Issue**: Default JWT secret in production
- **Fix**: Environment variable validation, throws error if JWT_SECRET not set in production
- **Location**: `src/config/index.ts`

### 2. CORS Configuration ✓
- **Issue**: CORS origin set to `*` (allow all)
- **Fix**: Restricted to specific origin (default: `http://localhost:3001`)
- **Location**: `src/app.ts`, `src/config/index.ts`

### 3. Device Storage Persistence ✓
- **Issue**: In-memory storage (data lost on restart)
- **Fix**: File-based persistent storage with automatic save/load
- **Location**: `src/services/device-storage.service.ts`

### 4. Request Body Size Limit ✓
- **Issue**: No limit on request body size
- **Fix**: 1MB limit on JSON and URL-encoded bodies
- **Location**: `src/app.ts`

### 5. Rate Limiting ✓
- **Issue**: No rate limiting
- **Fix**:
  - Auth endpoints: 10 requests per 15 minutes
  - API endpoints: 60 requests per minute
- **Location**: `src/middleware/rate-limit.middleware.ts`

### 6. Input Validation ✓
- **Issue**: Insufficient input validation
- **Fix**: Comprehensive validation for device registration
- **Location**: `src/middleware/validation.middleware.ts`

## Demo Components

### 1. Mock Gateway (`demo/mock-gateway.js`)
Simulates the backend gateway that receives WebSocket connections from the proxy.

### 2. E2E Test Script (`demo/test-e2e.js`)
Automated test that validates:
- Health check endpoint
- Device registration
- JWT token generation
- WebSocket connection with authentication
- Message round-trip (proxy → gateway → proxy)

### 3. Demo Runner (`demo/run-demo.sh`)
Orchestrates the complete demo:
- Starts mock gateway
- Starts HTTP proxy
- Runs E2E tests
- Reports results

## Running the Demo

### Prerequisites
```bash
cd /Users/robot/ghp/Guojiajia/src/http-proxy
npm install
```

### Run Demo
```bash
./demo/run-demo.sh
```

### Manual Testing

#### Terminal 1: Start Mock Gateway
```bash
node demo/mock-gateway.js
```

#### Terminal 2: Start HTTP Proxy
```bash
JWT_SECRET="test-secret-key" GATEWAY_WS_URL="ws://localhost:8080" npm run dev
```

#### Terminal 3: Run Tests
```bash
node demo/test-e2e.js
```

## Test Scenarios

### Scenario 1: Device Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "deviceName": "iPhone 15",
    "deviceType": "ios",
    "osVersion": "17.0",
    "appVersion": "1.0.0"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "deviceId": "uuid-here"
}
```

### Scenario 2: WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:3000/ws?token=YOUR_TOKEN');
ws.on('open', () => {
  ws.send(JSON.stringify({
    id: '123',
    type: 'request',
    data: { action: 'test' }
  }));
});
```

## Performance Metrics

Expected latency (local testing):
- Device registration: < 50ms
- WebSocket connection: < 100ms
- Message round-trip: < 50ms
- Total E2E flow: < 500ms

## Test Results Format

```
=== HTTP Proxy E2E Test ===

[0ms] Test 1: Health check
[45ms] ✓ Health check
[50ms] Test 2: Register device
[98ms] Token obtained eyJhbGc...
[102ms] ✓ Device registration
[105ms] Test 3: WebSocket connection with token
[156ms] ✓ WebSocket connection
[158ms] Test 4: Send message to proxy
[203ms] Received response {"id":"...","type":"response","data":{...}}
[205ms] ✓ Message round-trip

=== Test Summary ===
Passed: 4/4
Duration: 205ms
```

## Troubleshooting

### Port Already in Use
```bash
# Kill processes on ports 3000 and 8080
lsof -ti:3000 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

### JWT Secret Error
Ensure JWT_SECRET is set:
```bash
export JWT_SECRET="your-secret-key"
```

### WebSocket Connection Failed
Check that:
1. Mock gateway is running on port 8080
2. HTTP proxy GATEWAY_WS_URL points to ws://localhost:8080
3. Token is valid and not expired

## Next Steps

1. Deploy to staging environment
2. Configure production JWT secret
3. Set up monitoring and alerting
4. Implement additional security headers
5. Add comprehensive logging
