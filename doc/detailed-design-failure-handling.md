# 失败场景处理详细设计

**版本**: 1.0
**更新时间**: 2026-03-15
**状态**: 设计完成，待实现

---

## 一、失败场景分类

### 1.1 故障分类矩阵

```
┌─────────────┬──────────────┬──────────────┬──────────────┐
│  故障类型    │  影响范围     │  恢复时间     │  处理策略     │
├─────────────┼──────────────┼──────────────┼──────────────┤
│ LLM 超时    │  单次请求     │  立即         │  重试 + 降级  │
│ LLM 限流    │  短期多请求   │  秒级         │  队列 + 限流  │
│ LLM 错误    │  单次请求     │  立即         │  降级响应     │
│ Memory 故障 │  全局         │  分钟级       │  本地缓存     │
│ 网络故障    │  单设备       │  不确定       │  离线模式     │
│ 并发冲突    │  多设备       │  立即         │  CRDT 合并   │
│ 认证失败    │  单设备       │  立即         │  重新认证     │
│ 内容违规    │  单次请求     │  立即         │  拒绝 + 警告  │
└─────────────┴──────────────┴──────────────┴──────────────┘
```

---

## 二、LLM API 故障处理

### 2.1 超时处理

```typescript
class LLMClient {
  private readonly TIMEOUT_MS = 30000;  // 30秒超时
  private readonly MAX_RETRIES = 2;     // 最多重试2次

  async chat(messages: Message[]): Promise<string> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // 设置超时
        const response = await Promise.race([
          this.callLLMAPI(messages),
          this.timeout(this.TIMEOUT_MS)
        ]);

        return response;

      } catch (error) {
        lastError = error;

        if (error.name === 'TimeoutError') {
          console.warn(`[LLM] Timeout on attempt ${attempt + 1}`);

          // 指数退避
          if (attempt < this.MAX_RETRIES) {
            await this.sleep(Math.pow(2, attempt) * 1000);
            continue;
          }
        } else {
          // 非超时错误，不重试
          break;
        }
      }
    }

    // 所有重试失败，降级处理
    console.error('[LLM] All retries failed, falling back');
    return this.getFallbackResponse(messages);
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TimeoutError')), ms);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 2.2 限流处理

```typescript
class RateLimiter {
  private queue: Array<{
    messages: Message[];
    resolve: (value: string) => void;
    reject: (error: Error) => void;
  }> = [];

  private processing = false;
  private requestsPerMinute = 60;
  private requestCount = 0;
  private windowStart = Date.now();

  async enqueue(messages: Message[]): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({ messages, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // 检查速率限制
      const now = Date.now();
      if (now - this.windowStart >= 60000) {
        // 新的时间窗口
        this.requestCount = 0;
        this.windowStart = now;
      }

      if (this.requestCount >= this.requestsPerMinute) {
        // 达到限流，等待下一个窗口
        const waitTime = 60000 - (now - this.windowStart);
        console.warn(`[RateLimiter] Rate limit reached, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
        continue;
      }

      // 处理下一个请求
      const item = this.queue.shift()!;
      this.requestCount++;

      try {
        const response = await this.callLLM(item.messages);
        item.resolve(response);
      } catch (error) {
        item.reject(error);
      }

      // 请求间隔（避免突发）
      await this.sleep(1000 / this.requestsPerMinute * 60);
    }

    this.processing = false;
  }
}
```

### 2.3 错误码处理

```typescript
class LLMErrorHandler {
  async handleError(error: any, messages: Message[]): Promise<string> {
    const errorCode = error.code || error.status;

    switch (errorCode) {
      case 429: // Too Many Requests
        console.warn('[LLM] Rate limited by API');
        // 加入队列重试
        return this.rateLimiter.enqueue(messages);

      case 500: // Internal Server Error
      case 502: // Bad Gateway
      case 503: // Service Unavailable
        console.error('[LLM] API server error:', errorCode);
        // 降级到缓存响应
        return this.getCachedResponse(messages);

      case 400: // Bad Request
        console.error('[LLM] Invalid request:', error.message);
        // 返回错误提示
        return '抱歉，我没理解你的意思，能换个说法吗？';

      case 401: // Unauthorized
      case 403: // Forbidden
        console.error('[LLM] Authentication failed');
        // 刷新 API Key
        await this.refreshAPIKey();
        // 重试一次
        return this.callLLM(messages);

      default:
        console.error('[LLM] Unknown error:', error);
        return this.getFallbackResponse(messages);
    }
  }
}
```

### 2.4 降级响应策略

```typescript
class FallbackStrategy {
  private cache: Map<string, string> = new Map();

  /**
   * 获取降级响应
   */
  getFallbackResponse(messages: Message[]): string {
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop()?.content || '';

    // 策略1: 缓存命中
    const cached = this.getCachedResponse(lastUserMessage);
    if (cached) {
      return cached;
    }

    // 策略2: 规则匹配
    const ruleMatched = this.matchRule(lastUserMessage);
    if (ruleMatched) {
      return ruleMatched;
    }

    // 策略3: 通用回复
    return this.getGenericResponse();
  }

  /**
   * 缓存常见问题
   */
  private getCachedResponse(message: string): string | null {
    const normalized = message.toLowerCase().trim();

    const commonResponses: Record<string, string> = {
      '你好': '你好呀！今天想玩什么呢？',
      '我爱你': '我也爱你呀！',
      '讲个故事': '好呀！从前有一只小兔子...',
      '玩过家家': '好呀！今天我们玩什么角色呢？',
      '你叫什么': '我叫小爱，是你的好朋友！',
      '再见': '再见！下次再一起玩吧！'
    };

    for (const [key, value] of Object.entries(commonResponses)) {
      if (normalized.includes(key)) {
        return value;
      }
    }

    return null;
  }

  /**
   * 规则匹配
   */
  private matchRule(message: string): string | null {
    // 问候类
    if (/^(你好|hi|hello|嗨)/i.test(message)) {
      return '你好呀！很高兴见到你！';
    }

    // 情感表达
    if (/我爱你|喜欢你/.test(message)) {
      return '我也很喜欢你呀！';
    }

    // 请求类
    if (/讲.*故事|说.*故事/.test(message)) {
      return '好呀！让我想想讲什么故事好呢...';
    }

    return null;
  }

  /**
   * 通用回复
   */
  private getGenericResponse(): string {
    const responses = [
      '嗯嗯，我在听呢！',
      '这个问题有点难，让我想想...',
      '你说得真有趣！',
      '还有呢？继续说吧！',
      '我明白了，然后呢？'
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }
}
```

---

## 三、Memory 故障处理

### 3.1 多层降级策略

```typescript
class MemoryManager {
  private redis: RedisClient;
  private mongodb: MongoClient;
  private oss: OSSClient;
  private localCache: Map<string, MemoryData> = new Map();

  async get(deviceId: string): Promise<MemoryData> {
    try {
      // L1: Redis（热数据）
      const data = await this.redis.get(`mem:${deviceId}`);
      if (data) {
        this.localCache.set(deviceId, data); // 更新本地缓存
        return data;
      }
    } catch (error) {
      console.warn('[Memory] Redis failed, trying MongoDB');
    }

    try {
      // L2: MongoDB（温数据）
      const data = await this.mongodb.findOne({ device_id: deviceId });
      if (data) {
        this.localCache.set(deviceId, data);
        // 异步回写到 Redis
        this.redis.set(`mem:${deviceId}`, data).catch(console.error);
        return data;
      }
    } catch (error) {
      console.warn('[Memory] MongoDB failed, trying OSS');
    }

    try {
      // L3: OSS（冷数据）
      const key = this.getOSSKey(deviceId);
      const data = await this.oss.get(key);
      if (data) {
        this.localCache.set(deviceId, data);
        return data;
      }
    } catch (error) {
      console.warn('[Memory] OSS failed, using local cache');
    }

    // L4: 本地缓存（最后防线）
    const cached = this.localCache.get(deviceId);
    if (cached) {
      return cached;
    }

    // 所有层都失败，返回默认值
    console.error('[Memory] All layers failed, returning default');
    return this.getDefaultMemory(deviceId);
  }

  async set(deviceId: string, data: MemoryData): Promise<void> {
    // 先更新本地缓存（确保不丢失）
    this.localCache.set(deviceId, data);

    // 异步写入各层（失败不影响主流程）
    Promise.all([
      this.redis.set(`mem:${deviceId}`, data).catch(e =>
        console.error('[Memory] Redis write failed:', e)
      ),
      this.mongodb.upsert({ device_id: deviceId }, data).catch(e =>
        console.error('[Memory] MongoDB write failed:', e)
      )
    ]);
  }
}
```

### 3.2 数据一致性修复

```typescript
class ConsistencyChecker {
  /**
   * 定期检查数据一致性
   */
  async checkConsistency(deviceId: string): Promise<void> {
    const [redisData, mongoData] = await Promise.all([
      this.redis.get(`mem:${deviceId}`).catch(() => null),
      this.mongodb.findOne({ device_id: deviceId }).catch(() => null)
    ]);

    if (!redisData && !mongoData) {
      // 两层都没有数据，正常
      return;
    }

    if (!redisData && mongoData) {
      // Redis 缺失，从 MongoDB 恢复
      console.warn(`[Consistency] Restoring Redis from MongoDB for ${deviceId}`);
      await this.redis.set(`mem:${deviceId}`, mongoData);
      return;
    }

    if (redisData && !mongoData) {
      // MongoDB 缺失，从 Redis 恢复
      console.warn(`[Consistency] Restoring MongoDB from Redis for ${deviceId}`);
      await this.mongodb.insert(redisData);
      return;
    }

    // 两层都有数据，检查版本
    if (redisData.metadata.version !== mongoData.metadata.version) {
      console.warn(`[Consistency] Version mismatch for ${deviceId}`);

      // 取最新版本
      const latest = redisData.metadata.version > mongoData.metadata.version
        ? redisData
        : mongoData;

      // 同步到两层
      await Promise.all([
        this.redis.set(`mem:${deviceId}`, latest),
        this.mongodb.upsert({ device_id: deviceId }, latest)
      ]);
    }
  }
}
```

---

## 四、网络故障处理

### 4.1 离线检测

```typescript
class NetworkMonitor {
  private isOnline = true;
  private listeners: Array<(online: boolean) => void> = [];

  constructor() {
    // 监听网络状态
    window.addEventListener('online', () => this.setOnline(true));
    window.addEventListener('offline', () => this.setOnline(false));

    // 定期心跳检测
    setInterval(() => this.heartbeat(), 30000);
  }

  private async heartbeat() {
    try {
      const response = await fetch('https://api.guojiajia.com/health', {
        method: 'HEAD',
        timeout: 5000
      });

      this.setOnline(response.ok);
    } catch (error) {
      this.setOnline(false);
    }
  }

  private setOnline(online: boolean) {
    if (this.isOnline !== online) {
      this.isOnline = online;
      console.log(`[Network] Status changed: ${online ? 'online' : 'offline'}`);

      // 通知监听器
      this.listeners.forEach(listener => listener(online));
    }
  }

  onStatusChange(listener: (online: boolean) => void) {
    this.listeners.push(listener);
  }
}
```

### 4.2 离线模式

```typescript
class OfflineMode {
  private localQueue: Message[] = [];
  private localResponses: Map<string, string> = new Map();

  /**
   * 离线时的对话处理
   */
  async chat(message: string): Promise<string> {
    // 保存到本地队列
    this.localQueue.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    // 使用本地规则生成响应
    const response = this.getLocalResponse(message);

    this.localQueue.push({
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    });

    return response;
  }

  /**
   * 恢复在线后同步
   */
  async syncWhenOnline() {
    if (this.localQueue.length === 0) {
      return;
    }

    console.log(`[Offline] Syncing ${this.localQueue.length} messages`);

    try {
      // 批量上传离线消息
      await this.api.post('/sync/offline-messages', {
        messages: this.localQueue
      });

      // 清空队列
      this.localQueue = [];
      console.log('[Offline] Sync completed');

    } catch (error) {
      console.error('[Offline] Sync failed:', error);
      // 保留队列，下次再试
    }
  }

  /**
   * 本地响应生成
   */
  private getLocalResponse(message: string): string {
    // 使用预存的响应模板
    const templates = [
      '嗯嗯，我记住了！',
      '好的，等网络好了我们继续聊！',
      '你说得真有趣！',
      '我在听呢，继续说吧！'
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }
}
```

---

## 五、并发冲突处理

### 5.1 乐观锁

```typescript
class OptimisticLock {
  async update(deviceId: string, updater: (data: MemoryData) => MemoryData): Promise<void> {
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // 读取当前数据和版本号
      const current = await this.memory.get(deviceId);
      const currentVersion = current.metadata.version;

      // 应用更新
      const updated = updater(current);
      updated.metadata.version = currentVersion + 1;

      try {
        // 条件更新（版本号匹配才更新）
        const success = await this.memory.compareAndSet(
          deviceId,
          currentVersion,
          updated
        );

        if (success) {
          return; // 更新成功
        }

        // 版本冲突，重试
        console.warn(`[Lock] Version conflict on attempt ${attempt + 1}, retrying`);
        await this.sleep(Math.random() * 100); // 随机退避

      } catch (error) {
        console.error('[Lock] Update failed:', error);
        throw error;
      }
    }

    throw new Error('Failed to update after max retries');
  }
}
```

### 5.2 分布式锁

```typescript
class DistributedLock {
  private redis: RedisClient;

  async acquire(key: string, ttl: number = 5000): Promise<string | null> {
    const lockKey = `lock:${key}`;
    const lockValue = `${Date.now()}-${Math.random()}`;

    // SET NX EX: 只在键不存在时设置，并设置过期时间
    const acquired = await this.redis.set(
      lockKey,
      lockValue,
      'NX',
      'PX',
      ttl
    );

    return acquired ? lockValue : null;
  }

  async release(key: string, lockValue: string): Promise<void> {
    const lockKey = `lock:${key}`;

    // Lua 脚本确保原子性：只删除自己持有的锁
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    await this.redis.eval(script, 1, lockKey, lockValue);
  }

  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 5000
  ): Promise<T> {
    const lockValue = await this.acquire(key, ttl);

    if (!lockValue) {
      throw new Error('Failed to acquire lock');
    }

    try {
      return await fn();
    } finally {
      await this.release(key, lockValue);
    }
  }
}

// 使用示例
await distributedLock.withLock(`device:${deviceId}`, async () => {
  const data = await memory.get(deviceId);
  data.intimacy.points += 10;
  await memory.set(deviceId, data);
});
```

---

## 六、认证失败处理

### 6.1 Token 过期处理

```typescript
class TokenRefresher {
  private refreshing = false;
  private refreshPromise: Promise<string> | null = null;

  async ensureValidToken(): Promise<string> {
    const token = this.storage.get('access_token');
    const expiresAt = this.storage.get('expires_at');

    // Token 还有效
    if (token && Date.now() < expiresAt - 60000) {
      return token;
    }

    // 正在刷新中，等待
    if (this.refreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    // 开始刷新
    this.refreshing = true;
    this.refreshPromise = this.refreshToken();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshing = false;
      this.refreshPromise = null;
    }
  }

  private async refreshToken(): Promise<string> {
    const refreshToken = this.storage.get('refresh_token');

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.api.post('/auth/refresh', {
        refresh_token: refreshToken
      });

      // 保存新 token
      this.storage.set('access_token', response.access_token);
      this.storage.set('expires_at', Date.now() + response.expires_in * 1000);

      return response.access_token;

    } catch (error) {
      // 刷新失败，清除所有 token，需要重新登录
      this.storage.clear();
      throw new Error('Token refresh failed, please login again');
    }
  }
}
```

### 6.2 自动重试拦截器

```typescript
class AuthInterceptor {
  async request(config: RequestConfig): Promise<Response> {
    // 确保 token 有效
    const token = await this.tokenRefresher.ensureValidToken();
    config.headers['Authorization'] = `Bearer ${token}`;

    try {
      return await this.httpClient.request(config);

    } catch (error) {
      // 401 错误，尝试刷新 token 后重试
      if (error.status === 401 && !config._retry) {
        config._retry = true;

        try {
          // 强制刷新 token
          const newToken = await this.tokenRefresher.refreshToken();
          config.headers['Authorization'] = `Bearer ${newToken}`;

          // 重试请求
          return await this.httpClient.request(config);

        } catch (refreshError) {
          // 刷新失败，跳转到登录页
          this.router.navigate('/login');
          throw refreshError;
        }
      }

      throw error;
    }
  }
}
```

---

## 七、内容违规处理

### 7.1 敏感词过滤

```typescript
class ContentFilter {
  private sensitiveWords: Set<string> = new Set();
  private patterns: RegExp[] = [];

  constructor() {
    this.loadSensitiveWords();
  }

  /**
   * 检查内容是否违规
   */
  check(content: string): { safe: boolean; reason?: string } {
    // 1. 敏感词检查
    for (const word of this.sensitiveWords) {
      if (content.includes(word)) {
        return {
          safe: false,
          reason: `包含敏感词: ${this.mask(word)}`
        };
      }
    }

    // 2. 正则模式检查
    for (const pattern of this.patterns) {
      if (pattern.test(content)) {
        return {
          safe: false,
          reason: '内容不符合规范'
        };
      }
    }

    return { safe: true };
  }

  /**
   * 替换敏感词
   */
  replace(content: string): string {
    let result = content;

    for (const word of this.sensitiveWords) {
      const masked = '*'.repeat(word.length);
      result = result.replace(new RegExp(word, 'g'), masked);
    }

    return result;
  }

  private mask(word: string): string {
    if (word.length <= 2) {
      return '*'.repeat(word.length);
    }
    return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
  }

  private loadSensitiveWords() {
    // 从配置文件或数据库加载
    // 这里仅示例
    this.sensitiveWords = new Set([
      // 暴力相关
      '打人', '杀人', '血腥',
      // 不当内容
      // ... 更多敏感词
    ]);

    this.patterns = [
      /\d{11}/, // 手机号
      /\d{15,18}/, // 身份证号
      // ... 更多模式
    ];
  }
}
```

### 7.2 内容审核流程

```typescript
class ContentModerator {
  async moderate(content: string, type: 'input' | 'output'): Promise<ModerationResult> {
    // 1. 本地快速检查
    const localCheck = this.contentFilter.check(content);
    if (!localCheck.safe) {
      return {
        approved: false,
        reason: localCheck.reason,
        action: 'reject'
      };
    }

    // 2. 云端 AI 审核（异步）
    if (type === 'output') {
      this.cloudModerate(content).catch(error => {
        console.error('[Moderator] Cloud moderation failed:', error);
      });
    }

    return {
      approved: true,
      action: 'pass'
    };
  }

  private async cloudModerate(content: string): Promise<void> {
    try {
      const result = await this.api.post('/moderation/check', { content });

      if (!result.safe) {
        // 记录违规内容
        await this.logViolation(content, result.labels);

        // 通知家长
        await this.notifyParent(result);
      }
    } catch (error) {
      console.error('[Moderator] Cloud check failed:', error);
    }
  }
}
```

---

## 八、监控和告警

### 8.1 错误监控

```typescript
class ErrorMonitor {
  private errorCounts: Map<string, number> = new Map();
  private readonly ALERT_THRESHOLD = 10; // 10次错误触发告警

  recordError(type: string, error: Error) {
    const key = `${type}:${error.message}`;
    const count = (this.errorCounts.get(key) || 0) + 1;
    this.errorCounts.set(key, count);

    // 记录到日志
    console.error(`[Error] ${type}:`, error);

    // 上报到监控系统
    this.reportToMonitoring({
      type,
      message: error.message,
      stack: error.stack,
      timestamp: Date.now()
    });

    // 检查是否需要告警
    if (count >= this.ALERT_THRESHOLD) {
      this.alert(`${type} 错误频繁发生: ${error.message}`);
      this.errorCounts.delete(key); // 重置计数
    }
  }

  private alert(message: string) {
    // 发送告警（钉钉/企业微信/邮件）
    console.error(`[ALERT] ${message}`);
  }
}
```

### 8.2 健康检查

```typescript
class HealthChecker {
  async check(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkRedis(),
      this.checkMongoDB(),
      this.checkOSS(),
      this.checkLLMAPI(),
      this.checkGateway()
    ]);

    const results = checks.map((result, index) => ({
      component: ['Redis', 'MongoDB', 'OSS', 'LLM API', 'Gateway'][index],
      status: result.status === 'fulfilled' && result.value ? 'healthy' : 'unhealthy',
      error: result.status === 'rejected' ? result.reason : null
    }));

    const allHealthy = results.every(r => r.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      components: results,
      timestamp: Date.now()
    };
  }

  private async checkRedis(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  // ... 其他检查方法
}
```

---

**总结**: 本文档详细设计了各类失败场景的处理策略，包括超时重试、降级响应、离线模式、冲突解决等，确保系统在各种异常情况下仍能提供基本服务。
