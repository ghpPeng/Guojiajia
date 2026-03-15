# 多设备同步方案详细设计

**版本**: 1.0
**更新时间**: 2026-03-15
**状态**: 设计完成，待实现

---

## 一、问题定义

### 1.1 同步场景

```
场景 1: 手机 + 玩偶同时使用
- 孩子在家用玩偶玩过家家
- 出门后用手机继续对话
- 两个设备需要共享记忆和状态

场景 2: 多个玩偶
- 家里有多个玩偶（卧室、客厅）
- 孩子在不同房间切换使用
- 需要无缝切换，记忆连续

场景 3: 离线后同步
- 设备离线时继续使用（本地缓存）
- 恢复网络后同步到云端
- 需要合并离线期间的变更
```

### 1.2 冲突场景

```
冲突 1: 并发修改
- 设备 A: intimacy.points = 100 → 150 (时间 T1)
- 设备 B: intimacy.points = 100 → 120 (时间 T2)
- 如何决定最终值？

冲突 2: 字段级冲突
- 设备 A: learning.math.progress = 0.3 → 0.5
- 设备 B: learning.english.progress = 0.2 → 0.4
- 不同字段可以独立合并

冲突 3: 数组操作
- 设备 A: stories.push({id: 's1', content: '...'})
- 设备 B: stories.push({id: 's2', content: '...'})
- 需要合并两个新增项
```

---

## 二、方案选型

### 2.1 方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **Last-Write-Wins (LWW)** | 实现简单，性能高 | 可能丢失数据 | 低冲突场景 |
| **CRDT** | 自动合并，无冲突 | 实现复杂，存储开销大 | 高冲突场景 |
| **Operational Transform (OT)** | 精确合并 | 实现极复杂 | 协同编辑 |
| **版本向量 (Vector Clock)** | 检测冲突准确 | 需要手动解决冲突 | 需要人工介入 |

### 2.2 推荐方案：混合策略

```
┌─────────────────────────────────────────────────────────┐
│              混合同步策略                                │
├─────────────────────────────────────────────────────────┤
│  字段类型          │  同步策略          │  说明          │
├──────────────────┼──────────────────┼────────────────┤
│  intimacy.points │  LWW-Element-Set │  取最大值      │
│  intimacy.level  │  LWW             │  取最新时间戳  │
│  learning.*      │  LWW-Element-Set │  字段级合并    │
│  stories[]       │  OR-Set (CRDT)   │  自动合并数组  │
│  constraints[]   │  LWW-Element-Set │  字段级合并    │
└──────────────────┴──────────────────┴────────────────┘
```

**选型理由**:
1. **简单字段用 LWW**: intimacy.level 等单值字段，冲突少，LWW 足够
2. **累加字段用 Max**: intimacy.points 等积分字段，取最大值避免倒退
3. **数组用 CRDT**: stories 等列表，需要自动合并多个设备的新增项
4. **字段级合并**: learning 对象，不同科目独立合并

---

## 三、详细设计

### 3.1 数据结构扩展

```typescript
interface SyncableMemoryData extends MemoryData {
  // 同步元数据
  sync_metadata: {
    // 版本向量（每个设备一个计数器）
    version_vector: {
      [device_id: string]: number;
    };

    // 最后修改时间戳（字段级）
    field_timestamps: {
      'intimacy.level': number;
      'intimacy.points': number;
      'learning.math.progress': number;
      // ... 其他字段
    };

    // 最后同步时间
    last_synced: Date;

    // 冲突标记
    conflicts: Array<{
      field: string;
      local_value: any;
      remote_value: any;
      timestamp: Date;
    }>;
  };
}
```

### 3.2 LWW (Last-Write-Wins) 实现

```typescript
class LWWSync {
  /**
   * 合并两个版本的数据
   */
  merge(local: MemoryData, remote: MemoryData): MemoryData {
    const result = { ...local };

    // 比较每个字段的时间戳
    for (const field of SIMPLE_FIELDS) {
      const localTs = local.sync_metadata.field_timestamps[field];
      const remoteTs = remote.sync_metadata.field_timestamps[field];

      if (remoteTs > localTs) {
        // 远程更新，采用远程值
        this.setFieldValue(result, field, this.getFieldValue(remote, field));
        result.sync_metadata.field_timestamps[field] = remoteTs;
      }
    }

    return result;
  }

  /**
   * 更新字段时记录时间戳
   */
  updateField(data: MemoryData, field: string, value: any) {
    this.setFieldValue(data, field, value);
    data.sync_metadata.field_timestamps[field] = Date.now();

    // 增加版本向量
    const deviceId = data.device_id;
    data.sync_metadata.version_vector[deviceId] =
      (data.sync_metadata.version_vector[deviceId] || 0) + 1;
  }
}
```

### 3.3 OR-Set (CRDT) 实现

```typescript
/**
 * OR-Set: Observed-Remove Set
 * 用于 stories 数组的自动合并
 */
class ORSet<T> {
  private elements: Map<string, Set<string>>; // id -> {tag1, tag2, ...}

  /**
   * 添加元素
   */
  add(id: string, deviceId: string, timestamp: number) {
    const tag = `${deviceId}:${timestamp}`;

    if (!this.elements.has(id)) {
      this.elements.set(id, new Set());
    }
    this.elements.get(id)!.add(tag);
  }

  /**
   * 删除元素
   */
  remove(id: string) {
    this.elements.delete(id);
  }

  /**
   * 合并两个 OR-Set
   */
  merge(other: ORSet<T>): ORSet<T> {
    const result = new ORSet<T>();

    // 合并所有元素
    const allIds = new Set([
      ...this.elements.keys(),
      ...other.elements.keys()
    ]);

    for (const id of allIds) {
      const thisTags = this.elements.get(id) || new Set();
      const otherTags = other.elements.get(id) || new Set();

      // 取并集
      const mergedTags = new Set([...thisTags, ...otherTags]);

      if (mergedTags.size > 0) {
        result.elements.set(id, mergedTags);
      }
    }

    return result;
  }

  /**
   * 获取当前元素列表
   */
  toArray(): string[] {
    return Array.from(this.elements.keys());
  }
}

/**
 * Stories 同步实现
 */
class StoriesSync {
  private orset: ORSet<Story>;

  /**
   * 添加故事
   */
  addStory(story: Story, deviceId: string) {
    const timestamp = Date.now();
    this.orset.add(story.id, deviceId, timestamp);
  }

  /**
   * 合并两个设备的 stories
   */
  merge(local: Story[], remote: Story[], localDeviceId: string, remoteDeviceId: string): Story[] {
    const localSet = this.buildORSet(local, localDeviceId);
    const remoteSet = this.buildORSet(remote, remoteDeviceId);

    const mergedSet = localSet.merge(remoteSet);
    const mergedIds = mergedSet.toArray();

    // 重建 stories 数组
    const allStories = new Map<string, Story>();
    for (const story of [...local, ...remote]) {
      allStories.set(story.id, story);
    }

    return mergedIds
      .map(id => allStories.get(id)!)
      .filter(s => s != null)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 100); // 保留最近 100 条
  }

  private buildORSet(stories: Story[], deviceId: string): ORSet<Story> {
    const orset = new ORSet<Story>();
    for (const story of stories) {
      orset.add(story.id, deviceId, story.timestamp.getTime());
    }
    return orset;
  }
}
```

### 3.4 字段级合并 (LWW-Element-Set)

```typescript
/**
 * Learning 对象的字段级合并
 */
class LearningSync {
  merge(local: Learning, remote: Learning, localTs: FieldTimestamps, remoteTs: FieldTimestamps): Learning {
    const result: Learning = {};

    // 获取所有科目
    const allSubjects = new Set([
      ...Object.keys(local),
      ...Object.keys(remote)
    ]);

    for (const subject of allSubjects) {
      const localData = local[subject];
      const remoteData = remote[subject];

      if (!localData) {
        // 本地没有，使用远程
        result[subject] = remoteData;
      } else if (!remoteData) {
        // 远程没有，使用本地
        result[subject] = localData;
      } else {
        // 两边都有，字段级合并
        result[subject] = {
          progress: this.mergeField(
            localData.progress,
            remoteData.progress,
            localTs[`learning.${subject}.progress`],
            remoteTs[`learning.${subject}.progress`]
          ),
          last_lesson: this.mergeField(
            localData.last_lesson,
            remoteData.last_lesson,
            localTs[`learning.${subject}.last_lesson`],
            remoteTs[`learning.${subject}.last_lesson`]
          ),
          completed_tasks: this.mergeTasks(
            localData.completed_tasks,
            remoteData.completed_tasks
          ),
          current_level: Math.max(localData.current_level, remoteData.current_level)
        };
      }
    }

    return result;
  }

  private mergeField(localValue: any, remoteValue: any, localTs: number, remoteTs: number): any {
    return remoteTs > localTs ? remoteValue : localValue;
  }

  private mergeTasks(local: string[], remote: string[]): string[] {
    // 取并集
    return Array.from(new Set([...local, ...remote]));
  }
}
```

---

## 四、同步协议

### 4.1 同步流程

```
┌─────────┐                                    ┌─────────────┐
│  设备    │                                    │ Sync Service│
└────┬────┘                                    └──────┬──────┘
     │                                                │
     │ 1. 检测到本地变更                              │
     │    local_version++                            │
     │                                                │
     │ 2. POST /api/sync/push                        │
     │    {                                           │
     │      device_id,                                │
     │      version_vector,                           │
     │      changes: [...]                            │
     │    }                                           │
     ├───────────────────────────────────────────────>│
     │                                                │
     │                                                │ 3. 获取云端最新版本
     │                                                │    cloud_data = getFromMemory(device_id)
     │                                                │
     │                                                │ 4. 检测冲突
     │                                                │    conflicts = detectConflicts(
     │                                                │      local_changes,
     │                                                │      cloud_data
     │                                                │    )
     │                                                │
     │                                                │ 5. 合并数据
     │                                                │    merged = merge(
     │                                                │      local_changes,
     │                                                │      cloud_data
     │                                                │    )
     │                                                │
     │                                                │ 6. 保存到云端
     │                                                │    saveToMemory(device_id, merged)
     │                                                │
     │ 7. 返回合并结果                                │
     │<───────────────────────────────────────────────┤
     │    {                                           │
     │      status: 'merged',                         │
     │      version_vector,                           │
     │      conflicts: [...]                          │
     │    }                                           │
     │                                                │
     │ 8. 更新本地数据                                │
     │    applyMergedData(merged)                     │
     │                                                │
```

### 4.2 冲突检测

```typescript
class ConflictDetector {
  /**
   * 检测冲突
   */
  detectConflicts(local: MemoryData, remote: MemoryData): Conflict[] {
    const conflicts: Conflict[] = [];

    // 检查版本向量
    const localVV = local.sync_metadata.version_vector;
    const remoteVV = remote.sync_metadata.version_vector;

    // 判断是否并发修改
    const isConcurrent = !this.happensBefore(localVV, remoteVV) &&
                         !this.happensBefore(remoteVV, localVV);

    if (!isConcurrent) {
      // 没有并发修改，无冲突
      return [];
    }

    // 检查每个字段
    for (const field of ALL_FIELDS) {
      const localTs = local.sync_metadata.field_timestamps[field];
      const remoteTs = remote.sync_metadata.field_timestamps[field];

      if (Math.abs(localTs - remoteTs) < 1000) {
        // 时间戳相近（1秒内），可能是冲突
        const localValue = this.getFieldValue(local, field);
        const remoteValue = this.getFieldValue(remote, field);

        if (!this.isEqual(localValue, remoteValue)) {
          conflicts.push({
            field,
            local_value: localValue,
            remote_value: remoteValue,
            local_timestamp: localTs,
            remote_timestamp: remoteTs
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * 判断 A 是否发生在 B 之前
   */
  private happensBefore(vvA: VersionVector, vvB: VersionVector): boolean {
    let hasSmaller = false;

    for (const deviceId in vvA) {
      const a = vvA[deviceId] || 0;
      const b = vvB[deviceId] || 0;

      if (a > b) {
        return false; // A 有更大的版本号，不是发生在 B 之前
      }
      if (a < b) {
        hasSmaller = true;
      }
    }

    return hasSmaller;
  }
}
```

### 4.3 增量同步

```typescript
/**
 * 增量同步：只传输变更的字段
 */
class IncrementalSync {
  /**
   * 生成变更集
   */
  generateChanges(oldData: MemoryData, newData: MemoryData): Change[] {
    const changes: Change[] = [];

    for (const field of ALL_FIELDS) {
      const oldValue = this.getFieldValue(oldData, field);
      const newValue = this.getFieldValue(newData, field);

      if (!this.isEqual(oldValue, newValue)) {
        changes.push({
          field,
          old_value: oldValue,
          new_value: newValue,
          timestamp: newData.sync_metadata.field_timestamps[field]
        });
      }
    }

    return changes;
  }

  /**
   * 应用变更集
   */
  applyChanges(data: MemoryData, changes: Change[]): MemoryData {
    const result = { ...data };

    for (const change of changes) {
      const currentTs = result.sync_metadata.field_timestamps[change.field] || 0;

      if (change.timestamp > currentTs) {
        // 远程更新更新，应用变更
        this.setFieldValue(result, change.field, change.new_value);
        result.sync_metadata.field_timestamps[change.field] = change.timestamp;
      }
    }

    return result;
  }
}
```

---

## 五、离线支持

### 5.1 离线队列

```typescript
/**
 * 离线操作队列
 */
class OfflineQueue {
  private queue: Operation[] = [];

  /**
   * 添加操作到队列
   */
  enqueue(op: Operation) {
    this.queue.push(op);
    this.saveToLocalStorage();
  }

  /**
   * 网络恢复后同步
   */
  async syncWhenOnline() {
    if (!navigator.onLine) {
      return;
    }

    while (this.queue.length > 0) {
      const op = this.queue[0];

      try {
        await this.executeOperation(op);
        this.queue.shift(); // 成功后移除
        this.saveToLocalStorage();
      } catch (error) {
        if (error.code === 'CONFLICT') {
          // 冲突，需要合并
          await this.resolveConflict(op);
          this.queue.shift();
        } else {
          // 其他错误，稍后重试
          break;
        }
      }
    }
  }

  /**
   * 解决冲突
   */
  private async resolveConflict(op: Operation) {
    // 获取云端最新数据
    const cloudData = await fetchCloudData(op.device_id);

    // 合并本地操作
    const merged = this.mergeOperation(op, cloudData);

    // 推送合并结果
    await pushToCloud(merged);
  }
}
```

### 5.2 本地缓存策略

```typescript
/**
 * 本地缓存管理
 */
class LocalCache {
  /**
   * 读取数据（优先本地）
   */
  async read(deviceId: string): Promise<MemoryData> {
    // 1. 尝试从本地读取
    const localData = await this.readFromLocal(deviceId);

    if (navigator.onLine) {
      // 2. 在线时，后台同步云端数据
      this.syncFromCloud(deviceId).catch(err => {
        console.error('Background sync failed:', err);
      });
    }

    return localData;
  }

  /**
   * 写入数据（本地 + 云端）
   */
  async write(deviceId: string, data: MemoryData) {
    // 1. 立即写入本地
    await this.writeToLocal(deviceId, data);

    // 2. 尝试同步到云端
    if (navigator.onLine) {
      try {
        await this.syncToCloud(deviceId, data);
      } catch (error) {
        // 同步失败，加入离线队列
        offlineQueue.enqueue({
          type: 'write',
          device_id: deviceId,
          data,
          timestamp: Date.now()
        });
      }
    } else {
      // 离线，直接加入队列
      offlineQueue.enqueue({
        type: 'write',
        device_id: deviceId,
        data,
        timestamp: Date.now()
      });
    }
  }
}
```

---

## 六、性能优化

### 6.1 批量同步

```typescript
/**
 * 批量同步多个设备
 */
class BatchSync {
  private pendingDevices: Set<string> = new Set();
  private syncTimer: NodeJS.Timeout | null = null;

  /**
   * 标记设备需要同步
   */
  markForSync(deviceId: string) {
    this.pendingDevices.add(deviceId);

    // 延迟批量同步（100ms）
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    this.syncTimer = setTimeout(() => {
      this.executeBatchSync();
    }, 100);
  }

  /**
   * 执行批量同步
   */
  private async executeBatchSync() {
    const devices = Array.from(this.pendingDevices);
    this.pendingDevices.clear();

    // 并行同步
    await Promise.all(
      devices.map(deviceId => this.syncDevice(deviceId))
    );
  }
}
```

### 6.2 压缩传输

```typescript
/**
 * 压缩同步数据
 */
class CompressionSync {
  async push(deviceId: string, data: MemoryData) {
    // 1. 序列化
    const json = JSON.stringify(data);

    // 2. 压缩（gzip）
    const compressed = await gzip(json);

    // 3. 传输
    await fetch('/api/sync/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip'
      },
      body: compressed
    });
  }
}
```

---

## 七、测试场景

### 7.1 并发修改测试

```typescript
describe('Concurrent Modification', () => {
  it('should merge concurrent updates correctly', async () => {
    // 初始状态
    const initial = {
      device_id: 'dev_test',
      intimacy: { level: 5, points: 100 },
      sync_metadata: {
        version_vector: { 'dev_a': 0, 'dev_b': 0 },
        field_timestamps: {}
      }
    };

    // 设备 A 修改
    const deviceA = { ...initial };
    deviceA.intimacy.points = 150;
    deviceA.sync_metadata.version_vector['dev_a'] = 1;
    deviceA.sync_metadata.field_timestamps['intimacy.points'] = 1000;

    // 设备 B 修改
    const deviceB = { ...initial };
    deviceB.intimacy.points = 120;
    deviceB.sync_metadata.version_vector['dev_b'] = 1;
    deviceB.sync_metadata.field_timestamps['intimacy.points'] = 1001;

    // 合并
    const merged = await syncService.merge(deviceA, deviceB);

    // 验证：取最大值
    expect(merged.intimacy.points).toBe(150);
  });
});
```

### 7.2 离线同步测试

```typescript
describe('Offline Sync', () => {
  it('should queue operations when offline', async () => {
    // 模拟离线
    mockOffline();

    // 执行操作
    await memoryService.updateIntimacy('dev_test', { points: 200 });

    // 验证：操作已加入队列
    expect(offlineQueue.size()).toBe(1);

    // 模拟恢复在线
    mockOnline();
    await offlineQueue.syncWhenOnline();

    // 验证：队列已清空，数据已同步
    expect(offlineQueue.size()).toBe(0);
    const cloudData = await fetchCloudData('dev_test');
    expect(cloudData.intimacy.points).toBe(200);
  });
});
```

---

## 八、部署配置

### 8.1 同步服务配置

```yaml
sync_service:
  # 同步策略
  strategy:
    simple_fields: lww           # 简单字段用 LWW
    accumulative_fields: max     # 累加字段取最大值
    arrays: orset                # 数组用 OR-Set
    objects: lww_element_set     # 对象用字段级 LWW

  # 性能配置
  performance:
    batch_size: 100              # 批量同步数量
    batch_delay_ms: 100          # 批量延迟
    compression: true            # 启用压缩
    max_concurrent_syncs: 50     # 最大并发同步数

  # 冲突处理
  conflict_resolution:
    auto_resolve: true           # 自动解决冲突
    log_conflicts: true          # 记录冲突日志
    notify_on_conflict: false    # 冲突时不通知用户
```

---

## 九、监控指标

```yaml
metrics:
  # 同步性能
  - name: sync_latency_ms
    type: histogram
    labels: [device_id, sync_type]

  # 冲突率
  - name: conflict_rate
    type: gauge
    labels: [field, resolution_strategy]

  # 离线队列大小
  - name: offline_queue_size
    type: gauge
    labels: [device_id]

  # 同步成功率
  - name: sync_success_rate
    type: gauge
    labels: [device_id]
```

---

**总结**: 采用混合同步策略（LWW + CRDT），在保证数据一致性的同时，兼顾实现复杂度和性能。支持离线操作和自动冲突解决，适合多设备场景。