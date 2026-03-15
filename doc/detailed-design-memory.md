# Memory 系统详细设计

**版本**: 3.0
**更新时间**: 2026-03-15
**状态**: 设计完成，待实现

---

## 一、架构概览

### 1.1 三层架构

```
┌─────────────────────────────────────────────────────────┐
│                      应用层                              │
│              (Gateway / HTTP Proxy)                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Memory Manager                         │
│  - 统一接口                                              │
│  - 自动分层                                              │
│  - 故障降级                                              │
└─┬───────────────┬───────────────┬───────────────────────┘
  │               │               │
  ▼               ▼               ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│ L1:Redis│  │L2:MongoDB│  │ L3: OSS  │
│ 热数据   │  │ 温数据    │  │ 冷数据   │
│ <1小时   │  │ <7天     │  │ >7天     │
│ <10ms   │  │ <50ms    │  │ <500ms   │
└─────────┘  └──────────┘  └──────────┘
     │            │              │
     ▼            ▼              ▼
  [分片0]     [分片0-N]      [归档]
  [分片1]     [索引]         [压缩]
  [分片N]     [副本]         [加密]
```

### 1.2 设计原则

1. **读写分离**: 热数据走 Redis，持久化走 MongoDB
2. **自动分层**: 根据访问时间自动迁移数据
3. **故障降级**: 任一层故障不影响服务可用性
4. **最终一致**: 异步同步保证性能，最终一致保证正确性

---

## 二、分片策略

### 2.1 分片算法

```javascript
// 一致性哈希分片
function getShardId(deviceId, totalShards = 16) {
  const hash = murmurhash3(deviceId);
  return hash % totalShards;
}

// 示例
getShardId("dev_abc123", 16) // => 5
getShardId("dev_xyz789", 16) // => 12
```

### 2.2 分片配置

```yaml
sharding:
  total_shards: 16          # 总分片数（2的幂次，便于扩容）
  algorithm: murmur3        # 哈希算法
  rebalance_threshold: 0.2  # 负载不均衡阈值（20%）

redis:
  shards:
    - id: 0-7
      host: redis-cluster-1.internal
      port: 6379
    - id: 8-15
      host: redis-cluster-2.internal
      port: 6379

mongodb:
  shards:
    - id: 0-7
      host: mongo-shard-1.internal
      port: 27017
    - id: 8-15
      host: mongo-shard-2.internal
      port: 27017
```

### 2.3 扩容策略

```
当前 16 分片 → 扩容到 32 分片

迁移规则：
- 分片 0 → 保持 0，新增 16
- 分片 1 → 保持 1，新增 17
- ...
- 分片 15 → 保持 15，新增 31

迁移步骤：
1. 新增 16 个分片（只写不读）
2. 后台迁移数据（按 device_id 重新哈希）
3. 双写验证（新旧分片同时写入）
4. 切换读流量到新分片
5. 删除旧分片
```

---

## 三、数据模型

### 3.1 完整 Schema

```typescript
interface MemoryData {
  // 核心标识
  device_id: string;        // 设备唯一 ID
  shard_id: number;         // 分片 ID（自动计算）

  // 亲密度系统
  intimacy: {
    level: number;          // 1-10 级别
    points: number;         // 积分（0-无上限）
    last_interaction: Date; // 最后互动时间
    daily_interactions: number; // 今日互动次数
  };

  // 学习进度
  learning: {
    [subject: string]: {
      progress: number;     // 0.0-1.0
      last_lesson: Date;
      completed_tasks: string[];
      current_level: number;
    };
  };

  // 故事记忆（最近 100 条）
  stories: Array<{
    id: string;
    content: string;
    timestamp: Date;
    emotion: string;        // happy/sad/excited/calm
    tags: string[];         // 标签用于检索
  }>;

  // 约束规则
  constraints: Array<{
    type: string;           // time_limit/content_filter/skill_lock
    rule: object;
    enabled: boolean;
    created_by: string;     // parent_id
  }>;

  // 元数据
  metadata: {
    created_at: Date;
    last_updated: Date;
    last_synced: Date;      // 最后同步时间
    version: number;        // 版本号（用于冲突检测）
    checksum: string;       // 数据校验和
  };
}
```

### 3.2 数据验证

```typescript
const MemorySchema = {
  device_id: { type: 'string', required: true, pattern: /^dev_[a-z0-9]{16}$/ },
  shard_id: { type: 'number', min: 0, max: 15 },

  intimacy: {
    level: { type: 'number', min: 1, max: 10, integer: true },
    points: { type: 'number', min: 0, integer: true },
    last_interaction: { type: 'date', required: true },
    daily_interactions: { type: 'number', min: 0, integer: true }
  },

  learning: {
    '*': {
      progress: { type: 'number', min: 0, max: 1 },
      last_lesson: { type: 'date' },
      completed_tasks: { type: 'array', items: { type: 'string' } },
      current_level: { type: 'number', min: 1, integer: true }
    }
  },

  stories: {
    type: 'array',
    maxItems: 100,
    items: {
      id: { type: 'string', required: true },
      content: { type: 'string', required: true, maxLength: 1000 },
      timestamp: { type: 'date', required: true },
      emotion: { type: 'string', enum: ['happy', 'sad', 'excited', 'calm'] },
      tags: { type: 'array', items: { type: 'string' } }
    }
  }
};
```

---

## 四、数据生命周期

### 4.1 自动分层规则

```javascript
class MemoryLifecycle {
  // L1 → L2: 1小时后自动同步
  async syncL1ToL2(deviceId) {
    const data = await redis.get(`shard:${shardId}:mem:${deviceId}`);
    if (data && Date.now() - data.last_updated > 3600000) {
      await mongodb.upsert({ device_id: deviceId }, data);
      console.log(`[Lifecycle] Synced ${deviceId} to L2`);
    }
  }

  // L2 → L3: 7天后归档
  async archiveL2ToL3(deviceId) {
    const data = await mongodb.findOne({ device_id: deviceId });
    if (data && Date.now() - data.last_updated > 7 * 86400000) {
      const key = this.getOSSKey(deviceId, data.last_updated);
      await oss.put(key, JSON.stringify(data));
      await mongodb.deleteOne({ device_id: deviceId });
      console.log(`[Lifecycle] Archived ${deviceId} to L3`);
    }
  }

  // OSS 键格式
  getOSSKey(deviceId, timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const shardId = getShardId(deviceId);
    return `shard-${shardId}/${year}/${month}/${day}/${deviceId}.json`;
  }
}
```

### 4.2 定时任务

```yaml
cron_jobs:
  # 每小时同步 L1 → L2
  - name: sync_l1_to_l2
    schedule: "0 * * * *"  # 每小时整点
    command: node scripts/sync-l1-l2.js

  # 每天凌晨归档 L2 → L3
  - name: archive_l2_to_l3
    schedule: "0 2 * * *"  # 每天凌晨2点
    command: node scripts/archive-l2-l3.js

  # 每周清理过期数据
  - name: cleanup_expired
    schedule: "0 3 * * 0"  # 每周日凌晨3点
    command: node scripts/cleanup-expired.js
```

---

## 五、故障降级

### 5.1 降级策略

```javascript
class MemoryManager {
  constructor(config) {
    this.redis = config.redis;
    this.mongodb = config.mongodb;
    this.oss = config.oss;
    this.fallbackCache = new Map(); // 内存降级
  }

  // 读取数据（自动降级）
  async get(deviceId) {
    const shardId = getShardId(deviceId);

    try {
      // 尝试 L1 (Redis)
      const l1Data = await this.redis.get(`shard:${shardId}:mem:${deviceId}`);
      if (l1Data) {
        return JSON.parse(l1Data);
      }
    } catch (err) {
      console.warn(`[L1 Failed] ${err.message}, fallback to L2`);
    }

    try {
      // 降级到 L2 (MongoDB)
      const l2Data = await this.mongodb.findOne({ device_id: deviceId });
      if (l2Data) {
        // 回写到 L1
        this.redis.setex(`shard:${shardId}:mem:${deviceId}`, 3600, JSON.stringify(l2Data))
          .catch(err => console.warn(`[L1 Write Failed] ${err.message}`));
        return l2Data;
      }
    } catch (err) {
      console.warn(`[L2 Failed] ${err.message}, fallback to L3`);
    }

    try {
      // 降级到 L3 (OSS)
      const key = this.findLatestOSSKey(deviceId);
      const l3Data = await this.oss.get(key);
      if (l3Data) {
        return JSON.parse(l3Data);
      }
    } catch (err) {
      console.warn(`[L3 Failed] ${err.message}, fallback to memory`);
    }

    // 最终降级：内存缓存
    if (this.fallbackCache.has(deviceId)) {
      console.warn(`[Fallback] Using in-memory cache for ${deviceId}`);
      return this.fallbackCache.get(deviceId);
    }

    // 返回默认值
    return this.getDefaultMemory(deviceId);
  }

  // 写入数据（双写保证）
  async set(deviceId, data) {
    const shardId = getShardId(deviceId);
    data.shard_id = shardId;
    data.metadata.last_updated = new Date();
    data.metadata.version++;

    // 内存缓存（立即生效）
    this.fallbackCache.set(deviceId, data);

    // 异步写入 L1 和 L2
    const promises = [];

    // L1: Redis（快速缓存）
    promises.push(
      this.redis.setex(`shard:${shardId}:mem:${deviceId}`, 3600, JSON.stringify(data))
        .catch(err => console.error(`[L1 Write Failed] ${err.message}`))
    );

    // L2: MongoDB（持久化）
    promises.push(
      this.mongodb.updateOne(
        { device_id: deviceId },
        { $set: data },
        { upsert: true }
      ).catch(err => console.error(`[L2 Write Failed] ${err.message}`))
    );

    // 等待至少一个成功
    await Promise.race(promises);

    return data;
  }

  // 默认内存结构
  getDefaultMemory(deviceId) {
    return {
      device_id: deviceId,
      shard_id: getShardId(deviceId),
      intimacy: { level: 1, points: 0, last_interaction: new Date(), daily_interactions: 0 },
      learning: {},
      stories: [],
      constraints: [],
      metadata: {
        created_at: new Date(),
        last_updated: new Date(),
        last_synced: new Date(),
        version: 1,
        checksum: ''
      }
    };
  }
}
```

### 5.2 健康检查

```javascript
class HealthCheck {
  async checkMemoryHealth() {
    const results = {
      redis: { status: 'unknown', latency: 0 },
      mongodb: { status: 'unknown', latency: 0 },
      oss: { status: 'unknown', latency: 0 }
    };

    // Redis 健康检查
    try {
      const start = Date.now();
      await redis.ping();
      results.redis = { status: 'healthy', latency: Date.now() - start };
    } catch (err) {
      results.redis = { status: 'unhealthy', error: err.message };
    }

    // MongoDB 健康检查
    try {
      const start = Date.now();
      await mongodb.admin().ping();
      results.mongodb = { status: 'healthy', latency: Date.now() - start };
    } catch (err) {
      results.mongodb = { status: 'unhealthy', error: err.message };
    }

    // OSS 健康检查
    try {
      const start = Date.now();
      await oss.head('health-check.txt');
      results.oss = { status: 'healthy', latency: Date.now() - start };
    } catch (err) {
      results.oss = { status: 'unhealthy', error: err.message };
    }

    return results;
  }
}
```

---

## 六、性能优化

### 6.1 批量操作

```javascript
class BatchOperations {
  constructor(memoryManager) {
    this.manager = memoryManager;
    this.writeQueue = [];
    this.batchSize = 100;
    this.flushInterval = 1000; // 1秒

    setInterval(() => this.flush(), this.flushInterval);
  }

  // 批量写入
  async batchSet(deviceId, data) {
    this.writeQueue.push({ deviceId, data });

    if (this.writeQueue.length >= this.batchSize) {
      await this.flush();
    }
  }

  async flush() {
    if (this.writeQueue.length === 0) return;

    const batch = this.writeQueue.splice(0, this.batchSize);

    // MongoDB 批量写入
    const bulkOps = batch.map(({ deviceId, data }) => ({
      updateOne: {
        filter: { device_id: deviceId },
        update: { $set: data },
        upsert: true
      }
    }));

    await this.manager.mongodb.bulkWrite(bulkOps);
    console.log(`[Batch] Flushed ${batch.length} writes`);
  }
}
```

### 6.2 缓存预热

```javascript
class CacheWarmer {
  // 预热活跃用户数据
  async warmupActiveUsers() {
    // 查询最近1小时活跃的设备
    const activeDevices = await mongodb.find({
      'metadata.last_updated': { $gte: new Date(Date.now() - 3600000) }
    }).limit(1000).toArray();

    // 批量加载到 Redis
    const pipeline = redis.pipeline();
    for (const data of activeDevices) {
      const shardId = data.shard_id;
      const key = `shard:${shardId}:mem:${data.device_id}`;
      pipeline.setex(key, 3600, JSON.stringify(data));
    }
    await pipeline.exec();

    console.log(`[Warmup] Loaded ${activeDevices.length} active users to cache`);
  }
}
```

---

## 七、监控指标

### 7.1 关键指标

```yaml
metrics:
  # 延迟指标
  - name: memory_read_latency
    type: histogram
    labels: [layer, shard_id]
    buckets: [10, 50, 100, 500, 1000, 5000]

  - name: memory_write_latency
    type: histogram
    labels: [layer, shard_id]
    buckets: [10, 50, 100, 500, 1000, 5000]

  # 命中率
  - name: memory_cache_hit_rate
    type: gauge
    labels: [layer]

  # 错误率
  - name: memory_error_rate
    type: counter
    labels: [layer, error_type]

  # 数据量
  - name: memory_data_size
    type: gauge
    labels: [layer, shard_id]

  # 分片负载
  - name: memory_shard_load
    type: gauge
    labels: [shard_id]
```

### 7.2 告警规则

```yaml
alerts:
  # L1 延迟告警
  - name: RedisHighLatency
    expr: memory_read_latency{layer="redis", quantile="0.95"} > 50
    duration: 5m
    severity: warning
    message: "Redis P95 延迟超过 50ms"

  # L2 延迟告警
  - name: MongoDBHighLatency
    expr: memory_read_latency{layer="mongodb", quantile="0.95"} > 100
    duration: 5m
    severity: warning
    message: "MongoDB P95 延迟超过 100ms"

  # 缓存命中率告警
  - name: LowCacheHitRate
    expr: memory_cache_hit_rate{layer="redis"} < 0.7
    duration: 10m
    severity: warning
    message: "Redis 缓存命中率低于 70%"

  # 错误率告警
  - name: HighErrorRate
    expr: rate(memory_error_rate[5m]) > 0.01
    duration: 5m
    severity: critical
    message: "Memory 错误率超过 1%"

  # 分片不均衡告警
  - name: ShardImbalance
    expr: max(memory_shard_load) / min(memory_shard_load) > 1.5
    duration: 30m
    severity: warning
    message: "分片负载不均衡，需要重新平衡"
```

---

## 八、部署配置

### 8.1 Redis 集群配置

```yaml
redis:
  mode: cluster
  nodes:
    - host: redis-1.internal
      port: 6379
      slots: 0-5461
    - host: redis-2.internal
      port: 6379
      slots: 5462-10922
    - host: redis-3.internal
      port: 6379
      slots: 10923-16383

  replicas: 1  # 每个主节点1个副本

  config:
    maxmemory: 4gb
    maxmemory-policy: allkeys-lru
    save: ""  # 禁用 RDB（纯缓存）
    appendonly: no
```

### 8.2 MongoDB 分片配置

```yaml
mongodb:
  mode: sharded

  config_servers:
    - host: mongo-config-1.internal:27019
    - host: mongo-config-2.internal:27019
    - host: mongo-config-3.internal:27019

  shards:
    - name: shard0
      replicas:
        - host: mongo-shard0-1.internal:27018
        - host: mongo-shard0-2.internal:27018
        - host: mongo-shard0-3.internal:27018

    - name: shard1
      replicas:
        - host: mongo-shard1-1.internal:27018
        - host: mongo-shard1-2.internal:27018
        - host: mongo-shard1-3.internal:27018

  mongos:
    - host: mongo-router-1.internal:27017
    - host: mongo-router-2.internal:27017

  sharding_key: { device_id: "hashed" }

  indexes:
    - { device_id: 1 }  # 唯一索引
    - { shard_id: 1, last_updated: -1 }  # 分片 + 时间索引
    - { "metadata.last_updated": -1 }  # 归档查询索引
```

### 8.3 OSS 配置

```yaml
oss:
  provider: aliyun  # 或 aws-s3
  bucket: guojiajia-memory-archive
  region: cn-hangzhou

  lifecycle_rules:
    - name: archive_to_ia
      prefix: shard-
      days: 30
      storage_class: IA  # 低频访问

    - name: archive_to_archive
      prefix: shard-
      days: 90
      storage_class: Archive  # 归档存储

    - name: delete_old
      prefix: shard-
      days: 365
      action: delete  # 1年后删除

  encryption: AES256
  versioning: disabled
```

---

## 九、测试计划

### 9.1 单元测试

```javascript
describe('MemoryManager', () => {
  test('should get data from L1 cache', async () => {
    const data = await memoryManager.get('dev_test123');
    expect(data.device_id).toBe('dev_test123');
  });

  test('should fallback to L2 when L1 fails', async () => {
    redis.simulateFailure();
    const data = await memoryManager.get('dev_test123');
    expect(data).toBeDefined();
  });

  test('should handle concurrent writes', async () => {
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(memoryManager.set('dev_test123', { version: i }));
    }
    await Promise.all(promises);
    const data = await memoryManager.get('dev_test123');
    expect(data.metadata.version).toBeGreaterThan(0);
  });
});
```

### 9.2 集成测试

```javascript
describe('Memory Lifecycle', () => {
  test('should sync L1 to L2 after 1 hour', async () => {
    await memoryManager.set('dev_test123', testData);
    await sleep(3600000);  // 1小时
    await lifecycleManager.syncL1ToL2('dev_test123');

    const l2Data = await mongodb.findOne({ device_id: 'dev_test123' });
    expect(l2Data).toBeDefined();
  });

  test('should archive L2 to L3 after 7 days', async () => {
    const oldData = { ...testData, metadata: { last_updated: new Date(Date.now() - 8 * 86400000) } };
    await mongodb.insertOne(oldData);
    await lifecycleManager.archiveL2ToL3('dev_test123');

    const l3Key = lifecycleManager.getOSSKey('dev_test123', oldData.metadata.last_updated);
    const l3Data = await oss.get(l3Key);
    expect(l3Data).toBeDefined();
  });
});
```

### 9.3 压力测试

```javascript
describe('Performance Test', () => {
  test('should handle 1000 concurrent reads', async () => {
    const start = Date.now();
    const promises = [];
    for (let i = 0; i < 1000; i++) {
      promises.push(memoryManager.get(`dev_test${i}`));
    }
    await Promise.all(promises);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000);  // 5秒内完成
    console.log(`1000 reads in ${duration}ms, avg ${duration/1000}ms per read`);
  });

  test('should handle 1000 concurrent writes', async () => {
    const start = Date.now();
    const promises = [];
    for (let i = 0; i < 1000; i++) {
      promises.push(memoryManager.set(`dev_test${i}`, testData));
    }
    await Promise.all(promises);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10000);  // 10秒内完成
    console.log(`1000 writes in ${duration}ms, avg ${duration/1000}ms per write`);
  });
});
```

---

## 十、迁移指南

### 10.1 从单层到三层

```javascript
// 阶段一：只使用 Redis
const memoryV1 = new MemoryManager({
  redis: redisClient
});

// 阶段二：添加 MongoDB
const memoryV2 = new MemoryManager({
  redis: redisClient,
  mongodb: mongoClient
});

// 阶段三：添加 OSS
const memoryV3 = new MemoryManager({
  redis: redisClient,
  mongodb: mongoClient,
  oss: ossClient
});

// 数据迁移
async function migrateToV3() {
  const devices = await getAllDeviceIds();
  for (const deviceId of devices) {
    const data = await memoryV2.get(deviceId);
    await memoryV3.set(deviceId, data);
  }
}
```

---

**设计完成时间**: 2026-03-15
**审核状态**: 待审核
**下一步**: 实现 Memory Manager 核心代码
