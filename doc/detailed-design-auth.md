# 认证授权系统详细设计

**版本**: 1.0
**更新时间**: 2026-03-15
**状态**: 设计完成，待实现

---

## 一、架构概览

### 1.1 认证体系

```
┌─────────────────────────────────────────────────────────┐
│                    认证层级                              │
├─────────────────────────────────────────────────────────┤
│  L1: 设备认证 (Device Authentication)                   │
│      - device_id + device_secret                        │
│      - 设备指纹验证                                      │
│      - 用于设备首次注册和基础通信                        │
├─────────────────────────────────────────────────────────┤
│  L2: 家长授权 (Parent Authorization)                    │
│      - parent_id + OAuth2 token                         │
│      - 用于家长控制面板                                  │
│      - 管理设备、查看历史、设置约束                      │
├─────────────────────────────────────────────────────────┤
│  L3: 服务间认证 (Service-to-Service)                    │
│      - API Key + HMAC 签名                              │
│      - 用于 HTTP Proxy ↔ Gateway 通信                   │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Token 体系

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│   Token 类型  │   有效期      │   用途        │   存储位置    │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ device_token │   30天       │ 设备日常通信  │ 设备本地存储  │
│ access_token │   1小时      │ 家长操作     │ 内存/Redis   │
│ refresh_token│   30天       │ 刷新access   │ 数据库       │
│ api_key      │   永久       │ 服务间调用   │ 配置文件     │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

---

## 二、设备认证 (L1)

### 2.1 设备注册流程

```
┌─────────┐                                    ┌─────────────┐
│  设备    │                                    │ Auth Service│
└────┬────┘                                    └──────┬──────┘
     │                                                │
     │ 1. 生成 device_id (UUID)                      │
     │    device_id = "dev_" + uuid()                │
     │                                                │
     │ 2. POST /api/auth/device/register             │
     │    { device_id, device_info }                 │
     ├───────────────────────────────────────────────>│
     │                                                │
     │                                                │ 3. 生成 device_secret
     │                                                │    device_secret = random(32)
     │                                                │
     │                                                │ 4. 生成设备指纹
     │                                                │    fingerprint = hash(device_info)
     │                                                │
     │                                                │ 5. 存储到数据库
     │                                                │    devices.insert({
     │                                                │      device_id,
     │                                                │      device_secret_hash,
     │                                                │      fingerprint,
     │                                                │      status: 'unbound'
     │                                                │    })
     │                                                │
     │ 6. 返回 device_secret + device_token          │
     │<───────────────────────────────────────────────┤
     │    {                                           │
     │      device_secret: "xxx",                     │
     │      device_token: "jwt_xxx",                  │
     │      expires_in: 2592000                       │
     │    }                                           │
     │                                                │
     │ 7. 本地安全存储                                │
     │    SecureStorage.set("device_secret", xxx)     │
     │                                                │
```

### 2.2 设备认证流程

```javascript
// 每次请求携带 device_token
const headers = {
  'Authorization': `Bearer ${device_token}`,
  'X-Device-ID': device_id,
  'X-Device-Fingerprint': getCurrentFingerprint()
};

// 服务端验证
async function verifyDeviceToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const deviceId = req.headers['x-device-id'];
  const fingerprint = req.headers['x-device-fingerprint'];

  // 1. 验证 JWT
  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.device_id !== deviceId) {
    throw new Error('Device ID mismatch');
  }

  // 2. 验证设备指纹
  const device = await db.devices.findOne({ device_id: deviceId });
  if (device.fingerprint !== fingerprint) {
    // 设备指纹变化，可能是设备被替换
    await logSecurityEvent('fingerprint_mismatch', deviceId);
    throw new Error('Device fingerprint mismatch');
  }

  // 3. 检查设备状态
  if (device.status === 'blocked') {
    throw new Error('Device is blocked');
  }

  return { deviceId, device };
}
```

### 2.3 设备指纹生成

```javascript
// Android 设备指纹
function generateDeviceFingerprint() {
  const components = [
    Build.MANUFACTURER,        // 制造商
    Build.MODEL,              // 型号
    Build.DEVICE,             // 设备名
    Build.SERIAL,             // 序列号（需权限）
    Settings.Secure.ANDROID_ID, // Android ID
    getWifiMacAddress(),      // WiFi MAC（需权限）
  ];

  const fingerprint = components
    .filter(c => c != null)
    .join('|');

  return sha256(fingerprint);
}

// 嵌入式设备指纹
function generateEmbeddedFingerprint() {
  const components = [
    getCpuSerial(),           // CPU 序列号
    getMacAddress(),          // MAC 地址
    getStorageUUID(),         // 存储设备 UUID
  ];

  return sha256(components.join('|'));
}
```

### 2.4 设备绑定（家长扫码）

```
┌─────────┐         ┌─────────┐         ┌─────────────┐
│  设备    │         │ 家长App  │         │ Auth Service│
└────┬────┘         └────┬────┘         └──────┬──────┘
     │                   │                      │
     │ 1. 生成绑定码      │                      │
     │    binding_code = random(6)              │
     │                   │                      │
     │ 2. POST /api/auth/device/bind-request    │
     │    { device_id, binding_code }           │
     ├──────────────────────────────────────────>│
     │                   │                      │
     │                   │                      │ 3. 存储绑定请求
     │                   │                      │    TTL: 5分钟
     │                   │                      │
     │ 4. 显示二维码      │                      │
     │    QR: binding_code                      │
     │                   │                      │
     │                   │ 5. 扫码              │
     │                   │    获取 binding_code  │
     │                   │                      │
     │                   │ 6. POST /api/auth/device/bind
     │                   │    { parent_id, binding_code }
     │                   ├─────────────────────>│
     │                   │                      │
     │                   │                      │ 7. 验证并绑定
     │                   │                      │    devices.update({
     │                   │                      │      parent_id,
     │                   │                      │      status: 'bound'
     │                   │                      │    })
     │                   │                      │
     │                   │ 8. 返回成功          │
     │                   │<─────────────────────┤
     │                   │                      │
     │ 9. 轮询绑定状态    │                      │
     │    GET /api/auth/device/bind-status      │
     ├──────────────────────────────────────────>│
     │                   │                      │
     │ 10. 返回已绑定     │                      │
     │<───────────────────────────────────────────┤
     │                   │                      │
```

---

## 三、家长授权 (L2)

### 3.1 OAuth2 流程

```
┌─────────┐                                    ┌─────────────┐
│ 家长App  │                                    │ Auth Service│
└────┬────┘                                    └──────┬──────┘
     │                                                │
     │ 1. 微信/支付宝登录                             │
     │    跳转到第三方授权页面                        │
     │                                                │
     │ 2. 用户授权后回调                              │
     │    callback?code=xxx                           │
     │                                                │
     │ 3. POST /api/auth/parent/login                 │
     │    { code, provider: 'wechat' }                │
     ├───────────────────────────────────────────────>│
     │                                                │
     │                                                │ 4. 换取第三方 token
     │                                                │    wechat.getAccessToken(code)
     │                                                │
     │                                                │ 5. 获取用户信息
     │                                                │    wechat.getUserInfo(token)
     │                                                │
     │                                                │ 6. 创建/更新用户
     │                                                │    parents.upsert({
     │                                                │      openid,
     │                                                │      nickname,
     │                                                │      avatar
     │                                                │    })
     │                                                │
     │                                                │ 7. 生成 JWT tokens
     │                                                │    access_token = jwt.sign({
     │                                                │      parent_id,
     │                                                │      exp: now + 1h
     │                                                │    })
     │                                                │    refresh_token = random(32)
     │                                                │
     │ 8. 返回 tokens                                 │
     │<───────────────────────────────────────────────┤
     │    {                                           │
     │      access_token: "jwt_xxx",                  │
     │      refresh_token: "xxx",                     │
     │      expires_in: 3600,                         │
     │      parent_id: "parent_xxx"                   │
     │    }                                           │
     │                                                │
```

### 3.2 Token 刷新流程

```javascript
// 客户端：access_token 过期前自动刷新
async function refreshAccessToken() {
  const refreshToken = await storage.get('refresh_token');

  const response = await fetch('/api/auth/parent/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  const { access_token, expires_in } = await response.json();

  // 更新本地存储
  await storage.set('access_token', access_token);

  // 设置自动刷新（提前5分钟）
  setTimeout(refreshAccessToken, (expires_in - 300) * 1000);
}

// 服务端：验证并刷新
async function handleRefreshToken(req) {
  const { refresh_token } = req.body;

  // 1. 验证 refresh_token
  const session = await db.sessions.findOne({ refresh_token });
  if (!session || session.expires_at < Date.now()) {
    throw new Error('Invalid or expired refresh token');
  }

  // 2. 生成新的 access_token
  const access_token = jwt.sign({
    parent_id: session.parent_id,
    exp: Math.floor(Date.now() / 1000) + 3600
  }, JWT_SECRET);

  // 3. 更新 session
  await db.sessions.updateOne(
    { refresh_token },
    { $set: { last_refreshed: new Date() } }
  );

  return { access_token, expires_in: 3600 };
}
```

### 3.3 Token 撤销

```javascript
// 用户主动登出
async function logout(parentId) {
  // 删除所有 session
  await db.sessions.deleteMany({ parent_id: parentId });

  // 加入黑名单（用于已签发但未过期的 access_token）
  await redis.sadd(`blacklist:parent:${parentId}`, Date.now());
  await redis.expire(`blacklist:parent:${parentId}`, 3600); // 1小时后自动清理
}

// 验证时检查黑名单
async function verifyAccessToken(token) {
  const payload = jwt.verify(token, JWT_SECRET);

  // 检查是否在黑名单
  const isBlacklisted = await redis.sismember(
    `blacklist:parent:${payload.parent_id}`,
    payload.iat
  );

  if (isBlacklisted) {
    throw new Error('Token has been revoked');
  }

  return payload;
}
```

---

## 四、权限模型

### 4.1 权限定义

```typescript
enum Permission {
  // 设备权限
  DEVICE_VIEW = 'device:view',           // 查看设备信息
  DEVICE_CONTROL = 'device:control',     // 控制设备（重启、关机）
  DEVICE_UNBIND = 'device:unbind',       // 解绑设备

  // 对话权限
  CHAT_VIEW = 'chat:view',               // 查看对话历史
  CHAT_DELETE = 'chat:delete',           // 删除对话记录

  // 学习权限
  LEARNING_VIEW = 'learning:view',       // 查看学习进度
  LEARNING_MANAGE = 'learning:manage',   // 管理课程

  // 约束权限
  CONSTRAINT_VIEW = 'constraint:view',   // 查看约束规则
  CONSTRAINT_MANAGE = 'constraint:manage', // 管理约束规则

  // 管理员权限
  ADMIN_ALL = 'admin:*',                 // 所有权限
}

// 角色定义
const Roles = {
  PARENT: [
    Permission.DEVICE_VIEW,
    Permission.DEVICE_CONTROL,
    Permission.CHAT_VIEW,
    Permission.LEARNING_VIEW,
    Permission.LEARNING_MANAGE,
    Permission.CONSTRAINT_VIEW,
    Permission.CONSTRAINT_MANAGE,
  ],

  GUEST: [
    Permission.DEVICE_VIEW,
    Permission.CHAT_VIEW,
    Permission.LEARNING_VIEW,
  ],

  ADMIN: [Permission.ADMIN_ALL],
};
```

### 4.2 权限检查

```javascript
// 中间件：检查权限
function requirePermission(permission) {
  return async (req, res, next) => {
    const { parent_id } = req.auth; // 从 JWT 解析

    // 获取用户角色
    const parent = await db.parents.findOne({ parent_id });
    const role = parent.role || 'PARENT';

    // 检查权限
    const permissions = Roles[role];
    if (!permissions.includes(permission) && !permissions.includes('admin:*')) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    next();
  };
}

// 使用示例
app.delete('/api/chat/:id',
  authenticateParent,
  requirePermission(Permission.CHAT_DELETE),
  async (req, res) => {
    // 删除对话记录
  }
);
```

### 4.3 设备级权限

```javascript
// 检查家长是否有权限操作该设备
async function checkDeviceOwnership(parentId, deviceId) {
  const device = await db.devices.findOne({ device_id: deviceId });

  if (!device) {
    throw new Error('Device not found');
  }

  if (device.parent_id !== parentId) {
    throw new Error('You do not own this device');
  }

  return device;
}

// 使用示例
app.post('/api/device/:deviceId/restart',
  authenticateParent,
  requirePermission(Permission.DEVICE_CONTROL),
  async (req, res) => {
    const { deviceId } = req.params;
    const { parent_id } = req.auth;

    // 检查设备所有权
    await checkDeviceOwnership(parent_id, deviceId);

    // 执行重启
    await restartDevice(deviceId);

    res.json({ success: true });
  }
);
```

---

## 五、服务间认证 (L3)

### 5.1 API Key + HMAC 签名

```javascript
// HTTP Proxy → Gateway 认证
class ServiceAuth {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  // 生成签名
  sign(method, path, body, timestamp) {
    const message = [
      method.toUpperCase(),
      path,
      timestamp,
      body ? JSON.stringify(body) : ''
    ].join('\n');

    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
  }

  // 发送请求
  async request(method, path, body = null) {
    const timestamp = Date.now();
    const signature = this.sign(method, path, body, timestamp);

    const response = await fetch(`${GATEWAY_URL}${path}`, {
      method,
      headers: {
        'X-API-Key': this.apiKey,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    return response.json();
  }
}

// Gateway 验证签名
async function verifyServiceAuth(req) {
  const apiKey = req.headers['x-api-key'];
  const timestamp = req.headers['x-timestamp'];
  const signature = req.headers['x-signature'];

  // 1. 验证 API Key
  const service = await db.services.findOne({ api_key: apiKey });
  if (!service) {
    throw new Error('Invalid API key');
  }

  // 2. 验证时间戳（防重放攻击）
  const now = Date.now();
  if (Math.abs(now - timestamp) > 300000) { // 5分钟
    throw new Error('Request expired');
  }

  // 3. 验证签名
  const expectedSignature = crypto
    .createHmac('sha256', service.api_secret)
    .update([
      req.method,
      req.path,
      timestamp,
      req.body ? JSON.stringify(req.body) : ''
    ].join('\n'))
    .digest('hex');

  if (signature !== expectedSignature) {
    throw new Error('Invalid signature');
  }

  return service;
}
```

---

## 六、安全加固

### 6.1 防暴力破解

```javascript
// Rate limiting: 登录失败限制
const loginAttempts = new Map();

async function checkLoginAttempts(identifier) {
  const key = `login:${identifier}`;
  const attempts = loginAttempts.get(key) || 0;

  if (attempts >= 5) {
    const lockUntil = await redis.get(`lock:${key}`);
    if (lockUntil && Date.now() < lockUntil) {
      const remainingTime = Math.ceil((lockUntil - Date.now()) / 1000);
      throw new Error(`Too many attempts. Try again in ${remainingTime}s`);
    }
  }

  return attempts;
}

async function recordLoginAttempt(identifier, success) {
  const key = `login:${identifier}`;

  if (success) {
    // 成功则清除计数
    loginAttempts.delete(key);
    await redis.del(`lock:${key}`);
  } else {
    // 失败则增加计数
    const attempts = (loginAttempts.get(key) || 0) + 1;
    loginAttempts.set(key, attempts);

    if (attempts >= 5) {
      // 锁定15分钟
      await redis.set(`lock:${key}`, Date.now() + 900000, 'EX', 900);
    }
  }
}
```

### 6.2 防重放攻击

```javascript
// Nonce 机制
async function verifyNonce(nonce, timestamp) {
  // 1. 检查时间戳（5分钟内有效）
  if (Math.abs(Date.now() - timestamp) > 300000) {
    throw new Error('Request expired');
  }

  // 2. 检查 nonce 是否已使用
  const key = `nonce:${nonce}`;
  const exists = await redis.exists(key);
  if (exists) {
    throw new Error('Nonce already used');
  }

  // 3. 记录 nonce（5分钟过期）
  await redis.set(key, '1', 'EX', 300);
}
```

### 6.3 敏感操作二次验证

```javascript
// 敏感操作需要短信验证码
async function requireSmsVerification(parentId, action) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // 发送短信
  await sms.send(parent.phone, `验证码：${code}，用于${action}操作`);

  // 存储验证码（5分钟有效）
  await redis.set(`sms:${parentId}:${action}`, code, 'EX', 300);

  return { message: 'Verification code sent' };
}

async function verifySmsCode(parentId, action, code) {
  const expectedCode = await redis.get(`sms:${parentId}:${action}`);

  if (!expectedCode || expectedCode !== code) {
    throw new Error('Invalid verification code');
  }

  // 验证成功后删除
  await redis.del(`sms:${parentId}:${action}`);
}

// 使用示例：解绑设备
app.post('/api/device/:deviceId/unbind',
  authenticateParent,
  requirePermission(Permission.DEVICE_UNBIND),
  async (req, res) => {
    const { deviceId } = req.params;
    const { parent_id } = req.auth;
    const { sms_code } = req.body;

    // 验证短信验证码
    await verifySmsCode(parent_id, 'unbind_device', sms_code);

    // 执行解绑
    await unbindDevice(deviceId);

    res.json({ success: true });
  }
);
```

---

## 七、数据库设计

### 7.1 设备表

```sql
CREATE TABLE devices (
  device_id VARCHAR(32) PRIMARY KEY,
  device_secret_hash VARCHAR(64) NOT NULL,
  fingerprint VARCHAR(64) NOT NULL,
  device_info JSONB,
  parent_id VARCHAR(32),
  status VARCHAR(20) DEFAULT 'unbound', -- unbound/bound/blocked
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP,
  INDEX idx_parent_id (parent_id),
  INDEX idx_fingerprint (fingerprint)
);
```

### 7.2 家长表

```sql
CREATE TABLE parents (
  parent_id VARCHAR(32) PRIMARY KEY,
  openid VARCHAR(64) UNIQUE NOT NULL,
  provider VARCHAR(20) NOT NULL, -- wechat/alipay
  nickname VARCHAR(100),
  avatar VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'PARENT',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  INDEX idx_openid (openid)
);
```

### 7.3 会话表

```sql
CREATE TABLE sessions (
  session_id VARCHAR(32) PRIMARY KEY,
  parent_id VARCHAR(32) NOT NULL,
  refresh_token VARCHAR(64) UNIQUE NOT NULL,
  device_info JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  last_refreshed TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  INDEX idx_parent_id (parent_id),
  INDEX idx_refresh_token (refresh_token),
  INDEX idx_expires_at (expires_at)
);
```

### 7.4 服务表

```sql
CREATE TABLE services (
  service_id VARCHAR(32) PRIMARY KEY,
  service_name VARCHAR(100) NOT NULL,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  api_secret_hash VARCHAR(64) NOT NULL,
  permissions JSONB,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_api_key (api_key)
);
```

---

## 八、实施计划

### 阶段一：基础认证（第1-2周）
- [ ] 实现设备注册和认证
- [ ] 实现 JWT 生成和验证
- [ ] 实现设备指纹生成

### 阶段二：家长授权（第3-4周）
- [ ] 集成微信/支付宝 OAuth2
- [ ] 实现 Token 刷新机制
- [ ] 实现设备绑定流程

### 阶段三：权限系统（第5-6周）
- [ ] 实现 RBAC 权限模型
- [ ] 实现权限检查中间件
- [ ] 实现敏感操作二次验证

### 阶段四：安全加固（第7-8周）
- [ ] 实现 Rate Limiting
- [ ] 实现防重放攻击
- [ ] 实现服务间认证
- [ ] 安全审计和测试

---

**文档维护者**: Guojiajia Team
**最后更新**: 2026-03-15
