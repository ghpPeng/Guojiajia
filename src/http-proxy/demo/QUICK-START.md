# Quick Start Guide

## 1. Install Dependencies
```bash
cd /Users/robot/ghp/Guojiajia/src/http-proxy
npm install
```

## 2. Run the Demo
```bash
./demo/run-demo.sh
```

## 3. Expected Output
```
=== HTTP Proxy E2E Demo ===

Step 1: Starting Mock Gateway (port 8080)...
✓ Gateway started

Step 2: Starting HTTP Proxy (port 3000)...
✓ Proxy started

Step 3: Running E2E tests...

[0ms] Test 1: Health check
[45ms] ✓ Health check
[50ms] Test 2: Register device
[98ms] ✓ Device registration
[105ms] Test 3: WebSocket connection with token
[156ms] ✓ WebSocket connection
[158ms] Test 4: Send message to proxy
[205ms] ✓ Message round-trip

=== Test Summary ===
Passed: 4/4
Duration: 205ms

=== Demo completed successfully ===
```

## Manual Testing

### Terminal 1: Mock Gateway
```bash
node demo/mock-gateway.js
```

### Terminal 2: HTTP Proxy
```bash
JWT_SECRET="test-secret" GATEWAY_WS_URL="ws://localhost:8080" npm run dev
```

### Terminal 3: Test
```bash
node demo/test-e2e.js
```
