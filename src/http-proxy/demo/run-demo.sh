#!/bin/bash

set -e

echo "=== HTTP Proxy E2E Demo ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Check if services are running
check_port() {
  lsof -i :$1 > /dev/null 2>&1
}

# Cleanup function
cleanup() {
  echo ""
  echo "Cleaning up..."
  [ ! -z "$GATEWAY_PID" ] && kill $GATEWAY_PID 2>/dev/null
  [ ! -z "$PROXY_PID" ] && kill $PROXY_PID 2>/dev/null
  exit
}

trap cleanup EXIT INT TERM

cd "$(dirname "$0")/.."

# Step 1: Start Mock Gateway
echo "Step 1: Starting Mock Gateway (port 8080)..."
node demo/mock-gateway.js > /tmp/gateway.log 2>&1 &
GATEWAY_PID=$!
sleep 2

if ! check_port 8080; then
  echo -e "${RED}✗ Gateway failed to start${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Gateway started${NC}"

# Step 2: Start HTTP Proxy
echo ""
echo "Step 2: Starting HTTP Proxy (port 3000)..."
JWT_SECRET="test-secret-key" GATEWAY_WS_URL="ws://localhost:8080" npm run dev > /tmp/proxy.log 2>&1 &
PROXY_PID=$!
sleep 3

if ! check_port 3000; then
  echo -e "${RED}✗ Proxy failed to start${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Proxy started${NC}"

# Step 3: Run E2E tests
echo ""
echo "Step 3: Running E2E tests..."
echo ""
node demo/test-e2e.js

echo ""
echo -e "${GREEN}=== Demo completed successfully ===${NC}"
