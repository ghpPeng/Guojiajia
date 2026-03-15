# 监控告警系统详细设计

**版本**: 1.0
**更新时间**: 2026-03-15
**状态**: 设计完成，待实现

---

## 一、监控架构

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    监控数据流                            │
└─────────────────────────────────────────────────────────┘

┌──────────┐  ┌──────────┐  ┌──────────┐
│HTTP Proxy│  │ Gateway  │  │  Memory  │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     │ Metrics     │ Metrics     │ Metrics
     │ Logs        │ Logs        │ Logs
     │ Traces      │ Traces      │ Traces
     │             │             │
     └─────┬───────┴──────┬──────┘
           │              │
           ▼              ▼
     ┌──────────┐   ┌──────────┐
     │Prometheus│   │  Loki    │
     │(指标)    │   │ (日志)   │
     └────┬─────┘   └────┬─────┘
          │              │
          └──────┬───────┘
                 │
                 ▼
          ┌──────────┐
          │ Grafana  │
          │(可视化)  │
          └────┬─────┘
               │
               ▼
          ┌──────────┐
          │AlertMgr  │
          │(告警)    │
          └────┬─────┘
               │
          ┌────┴────┬────────┐
          ▼         ▼        ▼
       [钉钉]   [邮件]   [短信]
```

### 1.2 技术栈

```yaml
监控组件:
  - Prometheus: 指标采集和存储
  - Grafana: 可视化仪表盘
  - Loki: 日志聚合
  - AlertManager: 告警管理
  - Jaeger: 分布式追踪（可选）

客户端库:
  - prom-client (Node.js)
  - winston (日志)
  - opentelemetry (追踪)
```

---

## 二、监控指标设计

### 2.1 核心指标分类

```
┌─────────────┬──────────────┬──────────────┬──────────────┐
│  指标类型    │  示例         │  采集频率     │  保留时间     │
├─────────────┼──────────────┼──────────────┼──────────────┤
│ 业务指标    │  对话次数     │  实时         │  90天        │
│ 性能指标    │  响应延迟     │  实时         │  30天        │
│ 资源指标    │  CPU/内存     │  10秒         │  30天        │
│ 错误指标    │  错误率       │  实时         │  90天        │
│ 成本指标    │  API调用费用  │  小时         │  365天       │
└─────────────┴──────────────┴──────────────┴──────────────┘
```

### 2.2 业务指标

```typescript
// 业务指标定义
const businessMetrics = {
  // 对话相关
  chat_requests_total: new Counter({
    name: 'guojiajia_chat_requests_total',
    help: 'Total number of chat requests',
    labelNames: ['device_id', 'status']
  }),

  chat_duration_seconds: new Histogram({
    name: 'guojiajia_chat_duration_seconds',
    help: 'Chat request duration in seconds',
    labelNames: ['device_id'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  }),

  // 用户活跃度
  active_devices_total: new Gauge({
    name: 'guojiajia_active_devices_total',
    help: 'Number of active devices',
    labelNames: ['time_window'] // 1h, 24h, 7d
  }),

  daily_interactions_per_device: new Histogram({
    name: 'guojiajia_daily_interactions_per_device',
    help: 'Daily interactions per device',
    buckets: [0, 10, 20, 50, 100, 200]
  }),

  // 亲密度
  intimacy_level_distribution: new Histogram({
    name: 'guojiajia_intimacy_level_distribution',
    help: 'Distribution of intimacy levels',
    buckets: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  }),

  // 学习进度
  learning_progress: new Gauge({
    name: 'guojiajia_learning_progress',
    help: 'Learning progress by subject',
    labelNames: ['device_id', 'subject']
  })
};

// 使用示例
function recordChatRequest(deviceId: string, duration: number, success: boolean) {
  businessMetrics.chat_requests_total
    .labels(deviceId, success ? 'success' : 'error')
    .inc();

  businessMetrics.chat_duration_seconds
    .labels(deviceId)
    .observe(duration);
}
```

### 2.3 性能指标

```typescript
// 性能指标定义
const performanceMetrics = {
  // HTTP 代理延迟
  http_request_duration_seconds: new Histogram({
    name: 'guojiajia_http_request_duration_seconds',
    help: 'HTTP request duration',
    labelNames: ['method', 'path', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
  }),

  // LLM API 延迟
  llm_api_duration_seconds: new Histogram({
    name: 'guojiajia_llm_api_duration_seconds',
    help: 'LLM API call duration',
    labelNames: ['provider', 'model'],
    buckets: [0.5, 1, 2, 5, 10, 30]
  }),

  // LLM 首 token 延迟
  llm_first_token_duration_seconds: new Histogram({
    name: 'guojiajia_llm_first_token_duration_seconds',
    help: 'Time to first token from LLM',
    labelNames: ['provider', 'model'],
    buckets: [0.3, 0.5, 1, 2, 5]
  }),

  // Memory 操作延迟
  memory_operation_duration_seconds: new Histogram({
    name: 'guojiajia_memory_operation_duration_seconds',
    help: 'Memory operation duration',
    labelNames: ['operation', 'layer'], // operation: read/write, layer: L1/L2/L3
    buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1]
  }),

  // 端到端延迟
  e2e_latency_seconds: new Histogram({
    name: 'guojiajia_e2e_latency_seconds',
    help: 'End-to-end latency from user input to response',
    buckets: [0.5, 1, 1.5, 2, 3, 5, 10]
  })
};
```

### 2.4 资源指标

```typescript
// 资源指标定义
const resourceMetrics = {
  // CPU 使用率
  cpu_usage_percent: new Gauge({
    name: 'guojiajia_cpu_usage_percent',
    help: 'CPU usage percentage',
    labelNames: ['service', 'instance']
  }),

  // 内存使用
  memory_usage_bytes: new Gauge({
    name: 'guojiajia_memory_usage_bytes',
    help: 'Memory usage in bytes',
    labelNames: ['service', 'instance']
  }),

  // 连接数
  active_connections: new Gauge({
    name: 'guojiajia_active_connections',
    help: 'Number of active connections',
    labelNames: ['service', 'type'] // type: http/websocket/redis/mongo
  }),

  // 队列长度
  queue_length: new Gauge({
    name: 'guojiajia_queue_length',
    help: 'Length of processing queue',
    labelNames: ['queue_name']
  })
};

// 自动采集资源指标
function collectResourceMetrics() {
  setInterval(() => {
    const usage = process.cpuUsage();
    const memUsage = process.memoryUsage();

    resourceMetrics.cpu_usage_percent
      .labels('http-proxy', process.env.INSTANCE_ID)
      .set(usage.user / 1000000); // 转换为百分比

    resourceMetrics.memory_usage_bytes
      .labels('http-proxy', process.env.INSTANCE_ID)
      .set(memUsage.heapUsed);
  }, 10000); // 每10秒采集一次
}
```

### 2.5 错误指标

```typescript
// 错误指标定义
const errorMetrics = {
  // 错误总数
  errors_total: new Counter({
    name: 'guojiajia_errors_total',
    help: 'Total number of errors',
    labelNames: ['service', 'error_type', 'severity']
  }),

  // LLM API 错误
  llm_api_errors_total: new Counter({
    name: 'guojiajia_llm_api_errors_total',
    help: 'LLM API errors',
    labelNames: ['provider', 'error_code']
  }),

  // Memory 错误
  memory_errors_total: new Counter({
    name: 'guojiajia_memory_errors_total',
    help: 'Memory operation errors',
    labelNames: ['layer', 'operation', 'error_type']
  }),

  // 认证失败
  auth_failures_total: new Counter({
    name: 'guojiajia_auth_failures_total',
    help: 'Authentication failures',
    labelNames: ['auth_type', 'reason']
  }),

  // 内容过滤
  content_filtered_total: new Counter({
    name: 'guojiajia_content_filtered_total',
    help: 'Content filtered by safety check',
    labelNames: ['filter_type', 'severity']
  })
};
```

### 2.6 成本指标

```typescript
// 成本指标定义
const costMetrics = {
  // LLM API 调用成本
  llm_api_cost_yuan: new Counter({
    name: 'guojiajia_llm_api_cost_yuan',
    help: 'LLM API cost in CNY',
    labelNames: ['provider', 'model']
  }),

  // Token 使用量
  llm_tokens_used: new Counter({
    name: 'guojiajia_llm_tokens_used',
    help: 'Number of tokens used',
    labelNames: ['provider', 'model', 'type'] // type: input/output
  }),

  // 云服务成本（每小时更新）
  cloud_service_cost_yuan: new Gauge({
    name: 'guojiajia_cloud_service_cost_yuan',
    help: 'Cloud service cost in CNY',
    labelNames: ['service_type'] // compute/storage/network
  })
};

// 记录 LLM 调用成本
function recordLLMCost(provider: string, model: string, inputTokens: number, outputTokens: number) {
  const pricing = {
    'qwen-turbo': { input: 0.0008 / 1000, output: 0.002 / 1000 },
    'qwen-plus': { input: 0.004 / 1000, output: 0.012 / 1000 }
  };

  const price = pricing[model];
  const cost = inputTokens * price.input + outputTokens * price.output;

  costMetrics.llm_api_cost_yuan
    .labels(provider, model)
    .inc(cost);

  costMetrics.llm_tokens_used
    .labels(provider, model, 'input')
    .inc(inputTokens);

  costMetrics.llm_tokens_used
    .labels(provider, model, 'output')
    .inc(outputTokens);
}
```

---

## 三、日志设计

### 3.1 日志级别

```typescript
enum LogLevel {
  DEBUG = 'debug',   // 调试信息
  INFO = 'info',     // 一般信息
  WARN = 'warn',     // 警告
  ERROR = 'error',   // 错误
  FATAL = 'fatal'    // 致命错误
}
```

### 3.2 结构化日志

```typescript
import winston from 'winston';

// 日志配置
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // 控制台输出
    new winston.transports.Console({
      level: 'info'
    }),
    // 文件输出
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// 日志格式
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  instance_id: string;
  trace_id?: string;
  device_id?: string;
  message: string;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

// 使用示例
logger.info('Chat request received', {
  service: 'http-proxy',
  instance_id: process.env.INSTANCE_ID,
  trace_id: req.headers['x-trace-id'],
  device_id: req.body.device_id,
  metadata: {
    method: req.method,
    path: req.path,
    user_agent: req.headers['user-agent']
  }
});
```

### 3.3 审计日志

```typescript
// 审计日志（家长可查看）
interface AuditLog {
  timestamp: Date;
  device_id: string;
  event_type: string;
  actor: string; // device/parent/system
  action: string;
  details: Record<string, any>;
  ip_address?: string;
}

// 审计事件类型
enum AuditEventType {
  DEVICE_REGISTERED = 'device_registered',
  DEVICE_BOUND = 'device_bound',
  CHAT_MESSAGE = 'chat_message',
  LESSON_ADDED = 'lesson_added',
  CONSTRAINT_SET = 'constraint_set',
  CONTENT_FILTERED = 'content_filtered',
  AUTH_FAILED = 'auth_failed'
}

// 记录审计日志
function logAudit(log: AuditLog) {
  // 写入数据库（用于家长查询）
  await db.audit_logs.insert(log);

  // 同时写入日志系统
  logger.info('Audit event', {
    service: 'audit',
    event_type: log.event_type,
    device_id: log.device_id,
    metadata: log
  });
}
```

---

## 四、告警规则

### 4.1 告警级别

```
P0 (Critical): 立即处理，影响核心功能
P1 (High):     1小时内处理，影响部分功能
P2 (Medium):   24小时内处理，性能下降
P3 (Low):      一周内处理，潜在问题
```

### 4.2 告警规则定义

```yaml
# Prometheus 告警规则
groups:
  - name: guojiajia_critical
    interval: 30s
    rules:
      # P0: 服务完全不可用
      - alert: ServiceDown
        expr: up{job="http-proxy"} == 0
        for: 1m
        labels:
          severity: critical
          priority: P0
        annotations:
          summary: "HTTP Proxy service is down"
          description: "Instance {{ $labels.instance }} has been down for more than 1 minute"

      # P0: 错误率过高
      - alert: HighErrorRate
        expr: |
          rate(guojiajia_errors_total[5m]) > 10
        for: 2m
        labels:
          severity: critical
          priority: P0
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      # P0: LLM API 完全失败
      - alert: LLMAPIDown
        expr: |
          rate(guojiajia_llm_api_errors_total[5m]) / rate(guojiajia_chat_requests_total[5m]) > 0.9
        for: 3m
        labels:
          severity: critical
          priority: P0
        annotations:
          summary: "LLM API is failing"
          description: "LLM API failure rate is {{ $value | humanizePercentage }}"

  - name: guojiajia_high
    interval: 1m
    rules:
      # P1: 响应延迟过高
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, rate(guojiajia_e2e_latency_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: high
          priority: P1
        annotations:
          summary: "High latency detected"
          description: "P95 latency is {{ $value }}s"

      # P1: Memory 故障
      - alert: MemoryLayerDown
        expr: |
          rate(guojiajia_memory_errors_total{layer="L1"}[5m]) > 1
        for: 2m
        labels:
          severity: high
          priority: P1
        annotations:
          summary: "Memory L1 (Redis) is failing"
          description: "Redis error rate is {{ $value }} errors/sec"

      # P1: 认证失败率高
      - alert: HighAuthFailureRate
        expr: |
          rate(guojiajia_auth_failures_total[5m]) > 5
        for: 5m
        labels:
          severity: high
          priority: P1
        annotations:
          summary: "High authentication failure rate"
          description: "Auth failure rate is {{ $value }} failures/sec"

  - name: guojiajia_medium
    interval: 5m
    rules:
      # P2: CPU 使用率高
      - alert: HighCPUUsage
        expr: |
          guojiajia_cpu_usage_percent > 80
        for: 10m
        labels:
          severity: medium
          priority: P2
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value }}%"

      # P2: 内存使用率高
      - alert: HighMemoryUsage
        expr: |
          guojiajia_memory_usage_bytes / 1024 / 1024 / 1024 > 7
        for: 10m
        labels:
          severity: medium
          priority: P2
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}GB"

      # P2: 成本超预算
      - alert: CostOverBudget
        expr: |
          increase(guojiajia_llm_api_cost_yuan[1h]) > 100
        labels:
          severity: medium
          priority: P2
        annotations:
          summary: "Hourly cost exceeds budget"
          description: "Cost in last hour: ¥{{ $value }}"

  - name: guojiajia_low
    interval: 15m
    rules:
      # P3: 活跃设备数下降
      - alert: ActiveDevicesDropping
        expr: |
          (guojiajia_active_devices_total{time_window="24h"} - guojiajia_active_devices_total{time_window="24h"} offset 7d) / guojiajia_active_devices_total{time_window="24h"} offset 7d < -0.2
        labels:
          severity: low
          priority: P3
        annotations:
          summary: "Active devices dropped by 20%"
          description: "Active devices: {{ $value }}"
```

### 4.3 告警通知

```typescript
// 告警通知配置
interface AlertConfig {
  channels: {
    dingtalk: {
      webhook: string;
      enabled: boolean;
      priorities: string[]; // ['P0', 'P1']
    };
    email: {
      smtp: {
        host: string;
        port: number;
        user: string;
        password: string;
      };
      recipients: string[];
      enabled: boolean;
      priorities: string[];
    };
    sms: {
      provider: string;
      api_key: string;
      phone_numbers: string[];
      enabled: boolean;
      priorities: string[]; // ['P0']
    };
  };
}

// 发送告警
async function sendAlert(alert: Alert) {
  const config = getAlertConfig();

  // 钉钉通知
  if (config.channels.dingtalk.enabled &&
      config.channels.dingtalk.priorities.includes(alert.priority)) {
    await sendDingTalkAlert(alert);
  }

  // 邮件通知
  if (config.channels.email.enabled &&
      config.channels.email.priorities.includes(alert.priority)) {
    await sendEmailAlert(alert);
  }

  // 短信通知（仅 P0）
  if (config.channels.sms.enabled &&
      alert.priority === 'P0') {
    await sendSMSAlert(alert);
  }
}
```

---

## 五、可视化仪表盘

### 5.1 Grafana 仪表盘设计

```yaml
仪表盘列表:
  1. 业务概览
     - 活跃设备数（1h/24h/7d）
     - 对话次数趋势
     - 亲密度分布
     - 学习进度统计

  2. 性能监控
     - 端到端延迟（P50/P95/P99）
     - LLM API 延迟
     - Memory 操作延迟
     - 请求吞吐量

  3. 错误监控
     - 错误率趋势
     - 错误类型分布
     - LLM API 错误
     - Memory 错误

  4. 资源监控
     - CPU/内存使用率
     - 网络流量
     - 连接数
     - 队列长度

  5. 成本监控
     - 每日成本趋势
     - LLM API 成本占比
     - Token 使用量
     - 单用户成本

  6. 审计日志
     - 对话历史
     - 家长操作记录
     - 内容过滤记录
     - 认证失败记录
```

### 5.2 仪表盘示例（JSON）

```json
{
  "dashboard": {
    "title": "Guojiajia 业务概览",
    "panels": [
      {
        "title": "活跃设备数",
        "type": "graph",
        "targets": [
          {
            "expr": "guojiajia_active_devices_total{time_window=\"1h\"}",
            "legendFormat": "1小时"
          },
          {
            "expr": "guojiajia_active_devices_total{time_window=\"24h\"}",
            "legendFormat": "24小时"
          },
          {
            "expr": "guojiajia_active_devices_total{time_window=\"7d\"}",
            "legendFormat": "7天"
          }
        ]
      },
      {
        "title": "对话次数（每分钟）",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(guojiajia_chat_requests_total{status=\"success\"}[1m])",
            "legendFormat": "成功"
          },
          {
            "expr": "rate(guojiajia_chat_requests_total{status=\"error\"}[1m])",
            "legendFormat": "失败"
          }
        ]
      },
      {
        "title": "端到端延迟",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(guojiajia_e2e_latency_seconds_bucket[5m]))",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, rate(guojiajia_e2e_latency_seconds_bucket[5m]))",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, rate(guojiajia_e2e_latency_seconds_bucket[5m]))",
            "legendFormat": "P99"
          }
        ]
      },
      {
        "title": "每日成本",
        "type": "singlestat",
        "targets": [
          {
            "expr": "increase(guojiajia_llm_api_cost_yuan[24h])",
            "format": "¥{{ value }}"
          }
        ]
      }
    ]
  }
}
```

---

## 六、实施计划

### 6.1 阶段一：基础监控（第1周）

```
✓ 部署 Prometheus + Grafana
✓ 实现核心业务指标
✓ 实现性能指标
✓ 创建基础仪表盘
✓ 配置 P0 告警
```

### 6.2 阶段二：完善监控（第2-3周）

```
✓ 部署 Loki（日志聚合）
✓ 实现结构化日志
✓ 实现审计日志
✓ 配置 P1/P2 告警
✓ 集成钉钉/邮件通知
```

### 6.3 阶段三：高级功能（第4周+）

```
✓ 部署 Jaeger（分布式追踪）
✓ 实现成本监控
✓ 创建完整仪表盘
✓ 配置自动化响应
✓ 性能优化建议
```

---

**设计完成时间**: 2026-03-15
**下一步**: 开始实施阶段一基础监控