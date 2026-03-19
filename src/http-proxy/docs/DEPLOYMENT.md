# Deployment Guide

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local development)

## Quick Start

### 1. Using Docker Compose (Recommended)

Start both HTTP proxy and mock gateway:

```bash
docker-compose up -d
```

Check service health:

```bash
docker-compose ps
```

View logs:

```bash
docker-compose logs -f
```

Stop services:

```bash
docker-compose down
```

### 2. Local Development

Install dependencies:

```bash
npm install
```

Start mock gateway (Terminal 1):

```bash
node demo/mock-gateway.js
```

Start HTTP proxy (Terminal 2):

```bash
npm run dev
```

## Configuration

### Environment Variables

Create `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Key variables:

- `JWT_SECRET`: Secret key for JWT signing (required in production)
- `GATEWAY_WS_URL`: WebSocket gateway URL (default: ws://localhost:8080)
- `PORT`: HTTP server port (default: 3000)
- `NODE_ENV`: Environment (development/production/test)
- `LOG_LEVEL`: Logging level (debug/info/warn/error)

### Docker Environment

For Docker deployment, use `.env.docker` or set variables in `docker-compose.yml`.

## API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-18T00:00:00.000Z"
}
```

### Device Registration

```bash
POST /api/auth/register
Content-Type: application/json

{
  "deviceName": "my-device",
  "deviceType": "embedded",
  "osVersion": "1.0.0",
  "appVersion": "1.0.0"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### WebSocket Connection

```bash
ws://localhost:3000/ws
Authorization: Bearer <token>
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Docker Build Fails

```bash
# Clean Docker cache
docker-compose down -v
docker system prune -a

# Rebuild
docker-compose build --no-cache
```

### WebSocket Connection Fails

1. Check gateway is running: `curl http://localhost:8080`
2. Verify JWT token is valid
3. Check logs: `docker-compose logs http-proxy`

## Production Deployment

### Security Checklist

- [ ] Set strong `JWT_SECRET` (32+ characters)
- [ ] Use HTTPS/WSS in production
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting
- [ ] Set up log rotation
- [ ] Use environment-specific configs

### Docker Production Build

```bash
docker build -t guojiajia-http-proxy:latest .
docker run -d \
  -p 3000:3000 \
  -e JWT_SECRET=<strong-secret> \
  -e GATEWAY_WS_URL=wss://gateway.example.com \
  -e NODE_ENV=production \
  guojiajia-http-proxy:latest
```

### Health Monitoring

Set up health checks:

```bash
# HTTP health check
curl http://localhost:3000/health

# Docker health check (automatic)
docker inspect --format='{{.State.Health.Status}}' <container-id>
```

## Scaling

### Horizontal Scaling

Use a load balancer (nginx/HAProxy) with sticky sessions for WebSocket connections.

### Vertical Scaling

Adjust Node.js memory:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

## Backup & Recovery

### Configuration Backup

```bash
# Backup environment files
tar -czf config-backup.tar.gz .env .env.docker
```

### Log Backup

```bash
# Backup logs
tar -czf logs-backup.tar.gz logs/
```
