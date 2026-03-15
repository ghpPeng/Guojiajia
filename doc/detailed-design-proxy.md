# HTTP 代理层详细设计

**版本**: 1.0
**更新时间**: 2026-03-15
**状态**: 设计完成，待实现

---

## 一、架构定位

### 1.1 职责边界

```
┌─────────────────────────────────────────────────────────┐
│                    HTTP 代理层                           │
├─────────────────────────────────────────────────────────┤
│  核心职责：                                              │
│  ✓ 认证授权（设备 + 家长）                               │
│  ✓ 内容安全（敏感词过滤、不当内容检测）                   │
│  ✓ 流量控制（Rate Limiting、熔断）                       │
│  ✓ 请求路由（负载均衡、健康检查）                         │
│  ✓ 监控日志（访问日志、性能指标、审计日志）               │
│  ✓ 降级处理（缓存响应、离线模式）                         │
│                                                          │
│  不负责：                                                │
│  ✗ Agent 路由和编排（由 Gateway 负责）                   │
│  ✗ Memory 读写（由 Gateway 负责）                        │
│  ✗ LLM 调用（由 Gateway 负责）                           │
│  ✗ 工具调用（由 Gateway 负责）                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   OpenClaw Gateway                       │
├─────────────────────────────────────────────────────────┤
│  核心职责：                                              │
│  ✓ Agent 路由和编排                                      │
│  ✓ Memory 读写                                           │
│  ✓ LLM API 调用                                          │
│  ✓ 工具调用（Skill 执行）                                │
│  ✓ Streaming 输出                                        │
│                                                          │
│  不负责：                                                │
│  ✗ 认证授权（由 HTTP 代理负责）                          │
│  ✗ 内容安全（由 HTTP 代理负责）                          │
│  ✗ Rate Limiting（由 HTTP 代理负责）                     │
└─────────────────────────────────────────────────────────┘
```

### 1.2 数据流

```
┌─────────┐
│  设备    │
└────┬────┘
     │ HTTPS/WSS
     │ (加密传输)
     ▼
┌─────────────────┐
│  负载均衡 (SLB) │
└────────┬────────┘
         │
    ┌────┴────┬────────┐
    ▼         ▼        ▼
┌────────┐┌────────┐┌────────┐
│HTTP代理││HTTP代理││HTTP代理│
│  实例1  ││  实例2  ││  实例3  │
└───┬────┘└───┬────┘└───┬────┘
    │         │         │
    │  1. 认证授权      │
    │  2. 内容过滤      │
    │  3. Rate Limit    │
    │  4. 日志记录      │
    │         │         │
    └────┬────┴────┬────┘
         │         │
    ┌────┴────┬────┴────┐
    ▼         ▼         ▼
┌────────┐┌────────┐┌────────┐
│Gateway ││Gateway ││Gateway │
│  实例1  ││  实例2  ││  实例3  │
└────────┘└────────┘└────────┘
     │         │         │
     └────┬────┴────┬────┘
          ▼         ▼
    ┌──────────┬──────────┐
    │ LLM API  │  Memory  │
    └──────────┴──────────┘
```

---

## 二、API 设计

### 2.1 RESTful API

#### 2.1.1 设备管理

```yaml
# 设备注册
POST /api/v1/auth/device/register
Request:
  {
    "device_id": "dev_abc123",
    "device_info": {
      "model": "Raspberry Pi Zero 2W",
      "os": "Raspbian 11",
      "app_version": "1.0.0"
    }
  }
Response:
  {
    "device_secret": "secret_xxx",
    "device_token": "jwt_xxx",
    "expires_in": 2592000
  }

# 设备绑定请求
POST /api/v1/auth/device/bind-request
Headers:
  Authorization: Bearer {device_token}
Request:
  {
    "device_id": "dev_abc123",
    "binding_code": "123456"
  }
Response:
  {
    "binding_code": "123456",
    "expires_in": 300,
    "qr_code_url": "https://api.guojiajia.com/bind?code=123456"
  }

# 设备状态查询
GET /api/v1/device/status?device_id=dev_abc123
Headers:
  Authorization: Bearer {device_token}
Response:
  {
    "device_id": "dev_abc123",
    "status": "active",
    "bound_to": "parent_xyz",
    "intimacy": {
      "level": 5,
      "points": 1250
    },
    "learning": {
      "math": {"progress": 0.3},
      "english": {"progress": 0.2}
    },
    "last_active": "2026-03-15T10:00:00Z"
  }
```

#### 2.1.2 家长控制

```yaml
# 家长登录
POST /api/v1/auth/parent/login
Request:
  {
    "phone": "+86 138 xxxx xxxx",
    "verification_code": "123456"
  }
Response:
  {
    "access_token": "jwt_xxx",
    "refresh_token": "refresh_xxx",
    "expires_in": 3600,
    "parent_id": "parent_xyz"
  }

# 绑定设备（扫码）
POST /api/v1/parent/bind-device
Headers:
  Authorization: Bearer {access_token}
Request:
  {
    "binding_code": "123456",
    "device_name": "客厅玩偶"
  }
Response:
  {
    "device_id": "dev_abc123",
    "device_name": "客厅玩偶",
    "bound_at": "2026-03-15T10:00:00Z"
  }

# 添加课程
POST /api/v1/parent/add-lesson
Headers:
  Authorization: Bearer {access_token}
Request:
  {
    "device_id": "dev_abc123",
    "subject": "math",
    "content": "学习 1-10 的加减法",
    "duration": 30,
    "difficulty": "easy"
  }
Response:
  {
    "lesson_id": "lesson_001",
    "status": "scheduled",
    "created_at": "2026-03-15T10:00:00Z"
  }

# 设置约束规则
POST /api/v1/parent/set-constraint
Headers:
  Authorization: Bearer {access_token}
Request:
  {
    "device_id": "dev_abc123",
    "type": "time_limit",
    "rule": {
      "max_minutes_per_day": 60,
      "allowed_hours": ["09:00-12:00", "14:00-18:00"]
    },
    "enabled": true
  }
Response:
  {
    "constraint_id": "const_001",
    "status": "active"
  }

# 查看对话历史
GET /api/v1/parent/chat-history?device_id=dev_abc123&date=2026-03-15
Headers:
  Authorization: Bearer {access_token}
Response:
  {
    "device_id": "dev_abc123",
    "date": "2026-03-15",
    "conversations": [
      {
        "timestamp": "2026-03-15T10:00:00Z",
        "user": "我们玩过家家吧",
        "assistant": "好呀！今天想玩什么呢？",
        "emotion": "happy"
      }
    ],
    "total_interactions": 25,
    "total_duration_minutes": 45
  }
```

### 2.2 WebSocket API

#### 2.2.1 实时对话

```javascript
// 客户端连接
const ws = new WebSocket('wss://api.guojiajia.com/v1/chat');

// 认证
ws.send(JSON.stringify({
  type: 'auth',
  device_token: 'jwt_xxx',
  device_id: 'dev_abc123'
}));

// 发送消息
ws.send(JSON.stringify({
  type: 'message',
  text: '我们玩过家家吧',
  timestamp: Date.now()
}));

// 接收响应（streaming）
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'auth_success':
      console.log('认证成功');
      break;

    case 'response_chunk':
      // 流式响应片段
      console.log(data.text);
      updateUI(data.text);
      break;

    case 'response_complete':
      // 响应完成
      console.log('响应完成', data.emotion);
      break;

    case 'error':
      console.error('错误', data.message);
      break;
  }
};
```

#### 2.2.2 消息格式

```typescript
// 客户端 → 服务端
interface ClientMessage {
  type: 'auth' | 'message' | 'ping';
  device_token?: string;
  device_id?: string;
  text?: string;
  timestamp?: number;
}

// 服务端 → 客户端
interface ServerMessage {
  type: 'auth_success' | 'auth_failed' | 'response_chunk' | 'response_complete' | 'error' | 'pong';
  text?: string;
  emotion?: 'happy' | 'sad' | 'excited' | 'calm';
  chunk_id?: number;
  is_final?: boolean;
  message?: string;
  code?: string;
}
```

---

## 三、中间件设计

### 3.1 中间件链

```typescript
// 中间件执行顺序
const middlewares = [
  requestLogger,        // 1. 请求日志
  rateLimiter,          // 2. 限流
  authenticator,        // 3. 认证
  authorizer,           // 4. 授权
  contentFilter,        // 5. 内容过滤
  requestValidator,     // 6. 请求验证
  circuitBreaker,       // 7. 熔断器
  proxyHandler,         // 8. 代理转发
  responseFilter,       // 9. 响应过滤
  responseLogger,       // 10. 响应日志
  errorHandler          // 11. 错误处理
];

// Express 应用
const app = express();
middlewares.forEach(m => app.use(m));
```

### 3.2 认证中间件

```typescript
async function authenticator(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }

    // 验证 JWT
    const payload = jwt.verify(token, JWT_SECRET);

    // 检查 token 类型
    if (payload.type === 'device') {
      // 设备 token
      const deviceId = req.headers['x-device-id'];
      const fingerprint = req.headers['x-device-fingerprint'];

      if (payload.device_id !== deviceId) {
        return res.status(401).json({ error: 'Device ID mismatch' });
      }

      // 验证设备指纹
      const device = await deviceService.getDevice(deviceId);
      if (device.fingerprint !== fingerprint) {
        await securityService.logEvent('fingerprint_mismatch', deviceId);
        return res.status(401).json({ error: 'Device fingerprint mismatch' });
      }

      // 检查设备状态
      if (device.status === 'blocked') {
        return res.status(403).json({ error: 'Device is blocked' });
      }

      req.auth = { type: 'device', deviceId, device };

    } else if (payload.type === 'parent') {
      // 家长 token
      const parentId = payload.parent_id;
      const parent = await parentService.getParent(parentId);

      if (!parent) {
        return res.status(401).json({ error: 'Parent not found' });
      }

      req.auth = { type: 'parent', parentId, parent };

    } else {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### 3.3 限流中间件

```typescript
class RateLimiter {
  private redis: Redis;
  private rules: RateLimitRule[];

  constructor(redis: Redis) {
    this.redis = redis;
    this.rules = [
      { key: 'device', window: 60, limit: 60 },      // 每设备 60 req/min
      { key: 'parent', window: 60, limit: 100 },     // 每家长 100 req/min
      { key: 'global', window: 60, limit: 10000 },   // 全局 10000 req/min
    ];
  }

  async middleware(req: Request, res: Response, next: NextFunction) {
    try {
      const identifier = this.getIdentifier(req);

      for (const rule of this.rules) {
        const key = `ratelimit:${rule.key}:${identifier}`;
        const count = await this.redis.incr(key);

        if (count === 1) {
          await this.redis.expire(key, rule.window);
        }

        if (count > rule.limit) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            retry_after: await this.redis.ttl(key)
          });
        }
      }

      next();

    } catch (error) {
      console.error('[RateLimiter] Error:', error);
      next(); // 限流失败不影响请求
    }
  }

  private getIdentifier(req: Request): string {
    if (req.auth?.type === 'device') {
      return req.auth.deviceId;
    } else if (req.auth?.type === 'parent') {
      return req.auth.parentId;
    }
    return req.ip;
  }
}
```

### 3.4 内容过滤中间件

```typescript
class ContentFilter {
  private sensitiveWords: Set<string>;
  private llmFilter: LLMContentFilter;

  constructor() {
    this.sensitiveWords = new Set([
      // 敏感词列表
      '暴力', '色情', '政治', // ...
    ]);
    this.llmFilter = new LLMContentFilter();
  }

  async filterRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const text = req.body.text;

      // 1. 敏感词检测（快速）
      if (this.containsSensitiveWords(text)) {
        return res.status(400).json({
          error: 'Content contains sensitive words',
          code: 'SENSITIVE_CONTENT'
        });
      }

      // 2. LLM 内容检测（慢，异步）
      const isAppropriate = await this.llmFilter.check(text);
      if (!isAppropriate) {
        await this.logInappropriateContent(req.auth.deviceId, text);
        return res.status(400).json({
          error: 'Content is inappropriate',
          code: 'INAPPROPRIATE_CONTENT'
        });
      }

      next();

    } catch (error) {
      console.error('[ContentFilter] Error:', error);
      next(); // 过滤失败不影响请求（降级）
    }
  }

  async filterResponse(text: string): Promise<string> {
    // 响应内容过滤
    let filtered = text;

    // 替换敏感词
    for (const word of this.sensitiveWords) {
      filtered = filtered.replace(new RegExp(word, 'g'), '***');
    }

    return filtered;
  }

  private containsSensitiveWords(text: string): boolean {
    for (const word of this.sensitiveWords) {
      if (text.includes(word)) {
        return true;
      }
    }
    return false;
  }
}
```

### 3.5 熔断器中间件

```typescript
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;

  private readonly FAILURE_THRESHOLD = 5;      // 失败阈值
  private readonly TIMEOUT = 30000;            // 超时时间 30s
  private readonly RESET_TIMEOUT = 60000;      // 重置时间 60s

  async middleware(req: Request, res: Response, next: NextFunction) {
    if (this.state === 'OPEN') {
      // 熔断器打开，检查是否可以进入半开状态
      if (Date.now() - this.lastFailureTime > this.RESET_TIMEOUT) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        console.log('[CircuitBreaker] Entering HALF_OPEN state');
      } else {
        // 返回降级响应
        return this.fallbackResponse(req, res);
      }
    }

    // 记录请求开始时间
    const startTime = Date.now();

    // 包装 res.json 以捕获响应
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      const duration = Date.now() - startTime;

      if (res.statusCode >= 500 || duration > this.TIMEOUT) {
        this.onFailure();
      } else {
        this.onSuccess();
      }

      return originalJson(body);
    };

    next();
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        console.log('[CircuitBreaker] Entering CLOSED state');
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      this.state = 'OPEN';
      console.log('[CircuitBreaker] Entering OPEN state');
    }
  }

  private async fallbackResponse(req: Request, res: Response) {
    // 从缓存获取响应
    const cacheKey = `fallback:${req.path}:${JSON.stringify(req.body)}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // 返回默认响应
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      message: '服务暂时不可用，请稍后再试',
      code: 'SERVICE_UNAVAILABLE'
    });
  }
}
```

---

## 四、降级策略

### 4.1 降级场景

```typescript
enum FallbackScenario {
  GATEWAY_TIMEOUT = 'gateway_timeout',      // Gateway 超时
  GATEWAY_ERROR = 'gateway_error',          // Gateway 错误
  LLM_RATE_LIMIT = 'llm_rate_limit',       // LLM API 限流
  CIRCUIT_OPEN = 'circuit_open',            // 熔断器打开
  MEMORY_UNAVAILABLE = 'memory_unavailable' // Memory 不可用
}
```

### 4.2 降级响应

```typescript
class FallbackService {
  private cache: Redis;
  private templates: Map<string, string>;

  constructor(cache: Redis) {
    this.cache = cache;
    this.loadTemplates();
  }

  private loadTemplates() {
    this.templates = new Map([
      ['greeting', '你好呀！我是你的小伙伴~'],
      ['play', '好呀！我们一起玩吧~'],
      ['story', '让我给你讲个故事...'],
      ['goodbye', '再见！下次再玩~'],
      ['default', '我现在有点累了，等会儿再聊好吗？']
    ]);
  }

  async getFallbackResponse(text: string, scenario: FallbackScenario): Promise<string> {
    // 1. 尝试从缓存获取
    const cacheKey = `fallback:response:${text}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. 使用模板匹配
    const template = this.matchTemplate(text);
    if (template) {
      return template;
    }

    // 3. 返回默认响应
    return this.templates.get('default')!;
  }

  private matchTemplate(text: string): string | null {
    if (text.includes('你好') || text.includes('hi')) {
      return this.templates.get('greeting')!;
    }
    if (text.includes('玩') || text.includes('游戏')) {
      return this.templates.get('play')!;
    }
    if (text.includes('故事')) {
      return this.templates.get('story')!;
    }
    if (text.includes('再见') || text.includes('拜拜')) {
      return this.templates.get('goodbye')!;
    }
    return null;
  }
}
```

### 4.3 缓存策略

```typescript
class ResponseCache {
  private redis: Redis;
  private readonly TTL = 3600; // 1小时

  async get(deviceId: string, text: string): Promise<string | null> {
    const key = this.getCacheKey(deviceId, text);
    return await this.redis.get(key);
  }

  async set(deviceId: string, text: string, response: string) {
    const key = this.getCacheKey(deviceId, text);
    await this.redis.setex(key, this.TTL, response);
  }

  private getCacheKey(deviceId: string, text: string): string {
    const hash = crypto.createHash('md5').update(text).digest('hex');
    return `cache:response:${deviceId}:${hash}`;
  }

  // 常见问题预热
  async warmup(deviceId: string) {
    const commonQuestions = [
      { q: '你叫什么名字？', a: '我叫小伙伴，很高兴认识你！' },
      { q: '我们玩什么？', a: '我们可以玩过家家、讲故事、学习知识，你想玩什么呢？' },
      { q: '讲个故事', a: '好的，让我给你讲个故事...' }
    ];

    for (const { q, a } of commonQuestions) {
      await this.set(deviceId, q, a);
    }
  }
}
```

---

## 五、监控与日志

### 5.1 监控指标

```typescript
interface ProxyMetrics {
  // 请求指标
  requests_total: Counter;
  requests_duration: Histogram;
  requests_in_flight: Gauge;

  // 错误指标
  errors_total: Counter;
  errors_by_type: Counter;

  // 限流指标
  rate_limit_hits: Counter;
  rate_limit_blocks: Counter;

  // 熔断器指标
  circuit_breaker_state: Gauge;
  circuit_breaker_failures: Counter;

  // 缓存指标
  cache_hits: Counter;
  cache_misses: Counter;

  // Gateway 指标
  gateway_requests: Counter;
  gateway_errors: Counter;
  gateway_latency: Histogram;
}
```

### 5.2 日志格式

```typescript
interface AccessLog {
  timestamp: string;
  request_id: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
  device_id?: string;
  parent_id?: string;
  ip: string;
  user_agent: string;
  error?: string;
}

interface AuditLog {
  timestamp: string;
  event_type: string;
  actor_type: 'device' | 'parent';
  actor_id: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  details: object;
}
```

---

## 六、部署架构

### 6.1 阶段一：云服务（快速上线）

```yaml
# 使用阿里云 API Gateway
api_gateway:
  type: aliyun_api_gateway
  domain: api.guojiajia.com
  ssl: true
  plugins:
    - rate_limiting
    - ip_whitelist
    - cors

# 后端服务
backend:
  type: ecs
  instance_type: ecs.c6.large
  count: 2
  auto_scaling:
    min: 2
    max: 10
    cpu_threshold: 70%

# 数据库
redis:
  type: redis_cluster
  version: 6.0
  nodes: 3

mongodb:
  type: mongodb_replica_set
  version: 5.0
  nodes: 3
```

### 6.2 阶段三：自建（降低成本）

```yaml
# 负载均衡
load_balancer:
  type: nginx
  instances: 2
  algorithm: least_conn

# HTTP 代理
proxy:
  language: go
  framework: gin
  instances: 4
  resources:
    cpu: 2
    memory: 4GB

# 监控
monitoring:
  prometheus: true
  grafana: true
  alertmanager: true
```

---

**文档版本**: 1.0
**最后更新**: 2026-03-15
**状态**: 设计完成 ✅
