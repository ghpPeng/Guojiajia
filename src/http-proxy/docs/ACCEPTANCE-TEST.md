# Acceptance Test Checklist

## Prerequisites

```bash
cd src/http-proxy
npm install
```

---

## 1. Local Development (No Docker)

### 1.1 Build & Start

```bash
npm run build          # Should complete with no errors
npm run dev            # Server starts on port 3000
```

- [ ] Build completes without TypeScript errors
- [ ] Server logs: `HTTP server listening on port 3000`

### 1.2 Health Check

```bash
curl http://localhost:3000/health
# Expected: {"status":"healthy",...}

curl http://localhost:3000/api/health
# Expected: {"status":"healthy","services":{...}}
```

- [ ] `/health` returns `200` with `status: healthy`
- [ ] `/api/health` returns `200`

### 1.3 Device Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"deviceName":"test-device","deviceType":"embedded","osVersion":"1.0","appVersion":"1.0"}'
# Expected: {"success":true,"data":{"deviceId":"...","token":"eyJ..."}}
```

- [ ] Returns `200` with `success: true`
- [ ] Response contains `data.token` (JWT with 3 parts)
- [ ] Response contains `data.deviceId` (UUID)

### 1.4 Duplicate Registration

```bash
# Run the same registration command twice
# Expected: same token returned both times
```

- [ ] Second registration returns identical token

### 1.5 Validation Errors

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 400
```

- [ ] Empty body returns `400`
- [ ] Missing `deviceName` returns `400`

### 1.6 Token Verification

```bash
TOKEN="<token from registration>"
curl http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200

curl http://localhost:3000/api/auth/verify
# Expected: 401
```

- [ ] Valid token returns `200`
- [ ] Missing token returns `401`
- [ ] Invalid token returns `401`

### 1.7 WebSocket Connection

```bash
# Using wscat: npm install -g wscat
TOKEN="<token from registration>"
wscat -c "ws://localhost:3000/ws?token=$TOKEN"
# Expected: Connected, receives {"type":"connected",...}
```

- [ ] Valid token connects successfully
- [ ] Receives `connected` message on connect
- [ ] Invalid token connection is rejected (code 1008)
- [ ] Missing token connection is rejected (code 1008)

### 1.8 Message Forwarding

```bash
# After connecting via wscat, send:
{"type":"request","data":{"message":"hello"}}
# Expected: {"type":"response","payload":{"echo":{...},...}}
```

- [ ] Message receives echo response
- [ ] Response type is `response`

---

## 2. Automated E2E Tests

```bash
npm run test:e2e
```

- [ ] All 17 tests pass
- [ ] Test suites: 5 passed, 5 total
- [ ] No open handles warning (or Jest exits cleanly)

---

## 3. Docker Deployment

### 3.1 Build & Start

```bash
docker compose up -d
docker compose ps
```

- [ ] Both services start: `mock-gateway` and `http-proxy`
- [ ] Both show `healthy` status
- [ ] No build errors

### 3.2 Health Checks

```bash
docker compose ps
# Both services should show "(healthy)"
```

- [ ] `mock-gateway` health check passes
- [ ] `http-proxy` health check passes

### 3.3 Functional Verification

```bash
bash scripts/verify-deployment.sh
```

- [ ] All checks pass
- [ ] `Results: N passed, 0 failed`

### 3.4 Logs

```bash
docker compose logs http-proxy
docker compose logs mock-gateway
```

- [ ] No ERROR level logs on startup
- [ ] `WebSocket server initialized` appears in http-proxy logs

### 3.5 Teardown

```bash
docker compose down
```

- [ ] Services stop cleanly
- [ ] No orphan containers

---

## 4. Rate Limiting

```bash
# Send 6+ rapid registration requests
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"deviceName\":\"rate-test-$i\",\"deviceType\":\"embedded\",\"osVersion\":\"1.0\",\"appVersion\":\"1.0\"}"
done
```

- [ ] First requests return `200`
- [ ] After limit exceeded, returns `429`

---

## 5. Error Scenarios

- [ ] Server handles malformed JSON body gracefully (returns 400, not 500)
- [ ] Unknown routes return `404`
- [ ] Server continues operating after client WebSocket disconnect

---

## Sign-off

| Check | Result | Notes |
|-------|--------|-------|
| Local dev server starts | | |
| All E2E tests pass (17/17) | | |
| Docker deployment healthy | | |
| Verification script passes | | |
| Rate limiting works | | |

**Tested by:** _______________
**Date:** _______________
**Version:** 1.0.0
