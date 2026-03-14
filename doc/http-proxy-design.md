# HTTP 代理层设计

## 职责定位

HTTP 代理是安全网关和业务中台，承担以下职责：

### 1. 安全层
- **认证**：设备 ID + Token 验证
- **授权**：家长账号权限管理
- **加密**：HTTPS/WSS 强制加密
- **防护**：Rate limiting、DDoS 防护

### 2. 业务层
- **路由**：请求转发到 Gateway
- **过滤**：内容安全检查（敏感词、不当内容）
- **缓存**：常见问题缓存（减少 LLM 调用）
- **降级**：Gateway 故障时的备用响应

### 3. 运营层
- **日志**：所有对话记录（合规要求）
- **监控**：延迟、错误率、使用量
- **统计**：用户行为分析
- **审计**：家长可查看对话历史

---

## API 设计

### 认证流程
```
1. 设备首次启动 → 生成 device_id
2. 家长扫码绑定 → 获取 access_token
3. 后续请求携带 token
```

### 核心接口

#### 1. 对话接口（WebSocket）
```
ws://proxy.guojiajia.com/chat

# 客户端发送
{
  "type": "message",
  "device_id": "xxx",
  "token": "xxx",
  "text": "妈妈，我们玩过家家吧",
  "timestamp": 1710432199
}

# 服务端响应（streaming）
{
  "type": "response",
  "text": "好呀！",
  "emotion": "happy",
  "chunk_id": 1,
  "is_final": false
}
```

#### 2. 家长控制接口（HTTP）
```
POST /api/parent/add-lesson
Authorization: Bearer {parent_token}

{
  "device_id": "xxx",
  "subject": "math",
  "content": "学习加减法",
  "duration": 30
}
```

#### 3. 状态查询接口
```
GET /api/status?device_id=xxx
Authorization: Bearer {token}

Response:
{
  "intimacy": 5,
  "learning": {...},
  "last_active": "2026-03-14T15:00:00Z"
}
```

---

## 安全机制

### 1. 认证方案
```
设备层：device_id + device_secret (设备唯一)
家长层：parent_id + access_token (OAuth2)
```

### 2. Rate Limiting
```
每设备：60 req/min
每家长：100 req/min
全局：10000 req/min
```

### 3. 内容过滤
```
请求过滤：敏感词检测 → 拒绝
响应过滤：不当内容检测 → 替换/警告
```

---

## 技术选型建议

### 方案 A：自建（灵活性高）
- **语言**：Go / Node.js
- **框架**：Gin / Express
- **部署**：Docker + K8s
- **成本**：开发成本高，运维成本中

### 方案 B：云服务（快速上线）
- **API Gateway**：AWS API Gateway / 阿里云 API Gateway
- **认证**：AWS Cognito / 阿里云 RAM
- **WAF**：云厂商 WAF
- **成本**：开发成本低，运维成本低，使用成本中

### 推荐：方案 B（阶段一）→ 方案 A（阶段三）
- 早期用云服务快速验证
- 用户量大后自建降低成本
