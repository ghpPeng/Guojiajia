# Guojiajia HTTP Proxy - Deployment & E2E Testing Plan

## Project Status
- **Current Coverage**: 79.29% (35 unit tests)
- **Target Coverage**: 85%+
- **Tech Stack**: Express + TypeScript + JWT + WebSocket
- **Existing Tests**: Unit tests (device, jwt, auth, websocket) + Integration tests (health, auth routes)

## Week Goals
1. Local Docker deployment (HTTP proxy + Mock Gateway)
2. Complete E2E test scenarios
3. Automated test execution with reports
4. Documentation updates

---

## Phase 1: Docker Configuration (Day 1)

### 1.1 Multi-stage Dockerfile
**File**: `Dockerfile`
**Purpose**: Optimized production build

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 1.2 Docker Compose Setup
**File**: `docker-compose.yml`
**Services**:
- `http-proxy`: Main HTTP proxy service (port 3000)
- `mock-gateway`: WebSocket gateway simulator (port 8080)

**Key Features**:
- Health checks for both services
- Shared network for inter-service communication
- Volume mounts for logs
- Environment variable configuration

### 1.3 Environment Configuration
**Files**: `.env.docker`, `.env.test`
**Variables**:
- JWT_SECRET
- GATEWAY_WS_URL=ws://mock-gateway:8080
- PORT=3000
- NODE_ENV=production

---

## Phase 2: E2E Test Design (Day 2)

### 2.1 Test Scenarios

#### Scenario 1: Device Registration Flow
**Test**: `tests/e2e/01-device-registration.test.ts`
- Register new device → Receive JWT token
- Validate token structure and expiration
- Verify device stored in memory

#### Scenario 2: WebSocket Connection Flow
**Test**: `tests/e2e/02-websocket-connection.test.ts`
- Connect with valid JWT → Success
- Connect with invalid JWT → Rejection
- Connect without JWT → Rejection
- Verify connection to mock gateway established

#### Scenario 3: Message Forwarding Flow
**Test**: `tests/e2e/03-message-forwarding.test.ts`
- Send message from client → Proxy → Gateway
- Receive response from Gateway → Proxy → Client
- Verify message integrity (no data loss)
- Test concurrent messages (5+ simultaneous)

#### Scenario 4: Error Handling Flow
**Test**: `tests/e2e/04-error-handling.test.ts`
- Gateway disconnection → Client notification
- Invalid message format → Error response
- Token expiration during session → Graceful disconnect
- Reconnection after error → Success

#### Scenario 5: Full Integration Flow
**Test**: `tests/e2e/05-full-integration.test.ts`
- Complete user journey: Register → Connect → Send/Receive → Disconnect
- Multiple devices simultaneously (3+ devices)
- Load test: 50 messages in 10 seconds

### 2.2 Test Infrastructure

#### Mock Gateway Enhancement
**File**: `tests/e2e/helpers/enhanced-mock-gateway.ts`
**Features**:
- Configurable response delays
- Error injection capabilities
- Connection tracking
- Message history logging

#### E2E Test Utilities
**File**: `tests/e2e/helpers/e2e-utils.ts`
**Functions**:
- `registerDevice()`: Register and get JWT
- `connectWebSocket()`: Establish WS connection
- `sendMessage()`: Send and wait for response
- `waitForCondition()`: Polling helper
- `cleanupResources()`: Teardown helper

---

## Phase 3: Test Implementation (Day 3)

### 3.1 Test Setup
**File**: `tests/e2e/setup.ts`
- Start Docker containers before tests
- Wait for services to be healthy
- Initialize test database/state
- Configure test timeouts (30s per test)

### 3.2 Test Execution Script
**File**: `scripts/run-e2e.sh`
```bash
#!/bin/bash
# 1. Build Docker images
# 2. Start services with docker-compose
# 3. Wait for health checks
# 4. Run E2E tests
# 5. Generate HTML report
# 6. Cleanup containers
```

### 3.3 Jest Configuration
**File**: `jest.e2e.config.js`
- Separate config for E2E tests
- Longer timeouts (30s)
- Sequential execution (no parallel)
- HTML reporter integration

---

## Phase 4: Test Execution & Reporting (Day 4)

### 4.1 Test Execution
**Commands**:
```bash
npm run test:e2e          # Run E2E tests
npm run test:e2e:watch    # Watch mode
npm run test:e2e:report   # Generate HTML report
```

### 4.2 Coverage Integration
- Combine unit + integration + E2E coverage
- Target: 85%+ overall coverage
- Generate merged coverage report

### 4.3 CI/CD Integration
**File**: `.github/workflows/e2e-tests.yml` (optional)
- Run E2E tests on PR
- Upload test artifacts
- Fail PR if coverage < 85%

---

## Phase 5: Documentation (Day 5)

### 5.1 Deployment Documentation
**File**: `docs/DEPLOYMENT.md`
**Sections**:
- Prerequisites (Docker, Node.js)
- Quick Start (docker-compose up)
- Configuration (environment variables)
- Troubleshooting (common issues)
- Production deployment considerations

### 5.2 E2E Test Report
**File**: `docs/E2E-TEST-REPORT.md`
**Sections**:
- Test coverage summary
- Test scenario results
- Performance metrics
- Known issues and limitations
- Future improvements

---

## Deliverables Checklist

### Docker Configuration
- [ ] `Dockerfile` (multi-stage build)
- [ ] `docker-compose.yml` (proxy + gateway)
- [ ] `.env.docker` (production config)
- [ ] `.dockerignore` (exclude node_modules, tests)

### E2E Tests
- [ ] `tests/e2e/01-device-registration.test.ts`
- [ ] `tests/e2e/02-websocket-connection.test.ts`
- [ ] `tests/e2e/03-message-forwarding.test.ts`
- [ ] `tests/e2e/04-error-handling.test.ts`
- [ ] `tests/e2e/05-full-integration.test.ts`
- [ ] `tests/e2e/helpers/enhanced-mock-gateway.ts`
- [ ] `tests/e2e/helpers/e2e-utils.ts`
- [ ] `tests/e2e/setup.ts`

### Scripts & Configuration
- [ ] `scripts/run-e2e.sh` (test execution)
- [ ] `jest.e2e.config.js` (E2E Jest config)
- [ ] `package.json` (add E2E scripts)

### Documentation
- [ ] `docs/DEPLOYMENT.md` (deployment guide)
- [ ] `docs/E2E-TEST-REPORT.md` (test report)
- [ ] Update `README.md` (add E2E section)

---

## Success Metrics

1. **Coverage**: ≥85% overall (unit + integration + E2E)
2. **Test Execution**: All E2E tests pass consistently
3. **Docker Deployment**: One-command startup (`docker-compose up`)
4. **Documentation**: Complete deployment and testing guides
5. **Performance**: E2E test suite completes in <2 minutes

---

## Risk Mitigation

### Risk 1: Docker networking issues
**Mitigation**: Use explicit service names, test connectivity with health checks

### Risk 2: Flaky WebSocket tests
**Mitigation**: Implement retry logic, proper connection state verification

### Risk 3: Test timeout issues
**Mitigation**: Configure appropriate timeouts, use wait helpers

### Risk 4: Coverage calculation errors
**Mitigation**: Use jest-coverage-merger for accurate combined coverage

---

## Next Steps

1. **Start with Docker setup** - Foundation for E2E testing
2. **Implement test infrastructure** - Mock gateway and utilities
3. **Write E2E tests incrementally** - One scenario at a time
4. **Verify coverage targets** - Ensure 85%+ achieved
5. **Document everything** - Enable team adoption

**Estimated Timeline**: 5 days (1 day per phase)
**Priority**: High (enables local development and CI/CD)
