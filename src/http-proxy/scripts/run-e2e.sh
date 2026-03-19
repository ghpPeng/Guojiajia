#!/bin/bash
set -e

echo "🚀 Starting E2E Test Execution..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Build Docker images
echo "📦 Building Docker images..."
docker-compose build

# Step 2: Start services
echo "🔧 Starting services..."
docker-compose up -d

# Step 3: Wait for health checks
echo "⏳ Waiting for services to be healthy..."
timeout 60 bash -c 'until docker-compose ps | grep -q "healthy"; do sleep 2; done' || {
  echo -e "${RED}❌ Services failed to become healthy${NC}"
  docker-compose logs
  docker-compose down
  exit 1
}

echo -e "${GREEN}✅ Services are healthy${NC}"

# Step 4: Run E2E tests
echo "🧪 Running E2E tests..."
npm run test:e2e || TEST_FAILED=1

# Step 5: Generate coverage report
if [ -z "$TEST_FAILED" ]; then
  echo "📊 Generating coverage report..."
  npm run test:e2e:coverage
fi

# Step 6: Cleanup
echo "🧹 Cleaning up..."
docker-compose down

if [ -n "$TEST_FAILED" ]; then
  echo -e "${RED}❌ E2E tests failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ E2E tests completed successfully${NC}"
