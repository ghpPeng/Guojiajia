# Guojiajia 架构设计 v2

基于云端部署的架构方案

---

## 核心架构决策

### 1. HTTP 代理层是必要的
- Gateway 鉴权复杂，代理层统一处理
- 避免直接暴露 Gateway，提升安全性
- 代理层承担：鉴权、过滤、监控、降级

### 2. 嵌入式设备是瘦客户端
- 只负责音频采集和播放（STT/TTS）
- 所有智能处理在云端完成
- 降低硬件成本和复杂度

---

## 系统架构图

```
┌──────────────────┐
│  嵌入式设备/App  │
│  - STT (本地)    │
│  - TTS (本地)    │
│  - 音频 I/O      │
└────────┬─────────┘
         │ HTTPS/WSS
         │ (文本)
         ▼
┌──────────────────┐
│   负载均衡 (SLB) │
└────────┬─────────┘
         │
    ┌────┴────┬────────┐
    ▼         ▼        ▼
┌────────┐┌────────┐┌────────┐
│HTTP代理││HTTP代理││HTTP代理│
│ - 鉴权 ││ - 鉴权 ││ - 鉴权 │
│ - 过滤 ││ - 过滤 ││ - 过滤 │
│ - 监控 ││ - 监控 ││ - 监控 │
└───┬────┘└───┬────┘└───┬────┘
    │         │         │
    └────┬────┴────┬────┘
         ▼         ▼
    ┌─────────┬─────────┐
    │Gateway 1│Gateway 2│
    └────┬────┴────┬────┘
         │         │
         └────┬────┘
              ▼
    ┌──────────────────┐
    │  国内厂商 API    │
    │  通义千问/豆包   │
    └──────────────────┘
              │
              ▼
    ┌──────────────────┐
    │  共享 Memory     │
    │  (Redis/MongoDB) │
    └──────────────────┘
```

---

## 组件详解

### 1. 客户端（嵌入式设备/App）

**职责**：
- 音频采集（麦克风）
- 本地 STT（SpeechRecognizer）
- 本地 TTS（TextToSpeech）
- 音频播放（扬声器）
- 可选：Canvas 小脸显示

**技术栈**：
- Android：原生 Android (Min SDK 26)
- 嵌入式：树莓派 Zero 2W / ESP32-S3
- 通信：OkHttp (HTTPS) / WebSocket

**离线降级**：
- 缓存常见对话模板
- 网络断开时播放预存内容

---

### 2. HTTP 代理层

**职责**：
- 认证授权（设备 + 家长）
- 内容安全过滤
- Rate limiting
- 请求路由和负载均衡
- 日志和监控
- 降级处理

**技术选型**：
- 阶段一：云服务（AWS API Gateway / 阿里云）
- 阶段三：自建（Go + Gin / Node.js + Express）

**详细设计**：见 [http-proxy-design.md](./http-proxy-design.md)

---

### 3. OpenClaw Gateway

**职责**：
- Agent 路由和编排
- Streaming 输出
- Memory 读写
- 工具调用

**配置**：
```yaml
bind: 127.0.0.1:18789  # 不对外暴露
voice:
  streaming: true
agents:
  - child-doll
  - parent-orchestrator
```

---

### 4. child-doll Agent

**职责**：
- 角色扮演（妹妹/姐姐/学生）
- 情感交互（撒娇、亲密度）
- 教学引导

**配置**：
```yaml
model: qwen-turbo  # 阿里云通义千问 API
thinking: off
temperature: 0.8
api_key: ${DASHSCOPE_API_KEY}
```

**SOUL 设计**：
- 性格：活泼、好奇、爱学习
- 语气：儿童化、亲切
- 记忆：记住玩过的游戏、学过的知识

---

### 5. parent-orchestrator Agent

**职责**：
- 家长控制面板
- 添加课程
- 查看学习进度
- 设置约束规则
- 紧急干预

**API**：
```
add_lesson(subject, content)
get_status()
set_constraint(rule)
emergency_stop()
```

---

### 6. 共享 Memory

**数据结构**：
```json
{
  "device_id": "xxx",
  "intimacy": {
    "level": 5,
    "points": 1250
  },
  "learning": {
    "math": {"progress": 0.3},
    "english": {"progress": 0.2}
  },
  "stories": [...],
  "constraints": [...]
}
```

**技术选型**：
- 阶段一：Redis（快速读写）
- 阶段三：MongoDB（复杂查询）+ Redis（缓存）

---

## 数据流

```
1. 用户说话
   ↓
2. 设备本地 STT → 文本
   ↓
3. HTTPS POST 到代理
   {
     "device_id": "xxx",
     "token": "xxx",
     "text": "我们玩过家家吧"
   }
   ↓
4. 代理鉴权 + 过滤
   ↓
5. 转发到 Gateway
   ↓
6. Gateway → child-doll Agent
   ↓
7. LLM 推理（streaming）
   ↓
8. 响应流式返回
   {
     "text": "好呀！",
     "emotion": "happy",
     "chunk_id": 1
   }
   ↓
9. 设备本地 TTS → 语音
   ↓
10. 播放 + 更新小脸表情
```

---

## 延迟分析

### 端到端延迟（云端部署 + 国内厂商 API）

| 环节 | 耗时 | 备注 |
|------|------|------|
| 本地 STT | 300ms | 依赖句子长度 |
| 网络上行 | 30-80ms | 4G/WiFi 国内网络 |
| 代理处理 | 20-50ms | 鉴权+过滤 |
| Gateway 路由 | 10-30ms | |
| API 调用（首token） | 300-800ms | 通义千问/豆包 API |
| 网络下行 | 30-80ms | |
| 本地 TTS | 300ms | |
| **总计** | **1.0-1.6s** | 首次响应 |

### 优化策略

1. **Streaming 输出**：边生成边播放，降低感知延迟
2. **预测性 TTS**：提前合成部分内容
3. **缓存常见问题**：命中缓存 <500ms
4. **选择低延迟 API**：豆包 API 延迟通常更低

**目标**：首次响应 <1.5s，streaming 后感知延迟 <800ms

---

## 成本估算

详见 [cost-and-availability.md](./cost-and-availability.md)

**使用国内厂商 API（通义千问-Turbo）**：

**阶段一（验证期，10-100 用户）**：
- API 调用：¥1.2/月/用户
- 云服务器（代理+Gateway）：¥200-500/月
- 总成本：¥300-600/月（支持 100 用户）
- 单用户成本：¥3-6/月

**阶段三（规模化，1000+ 用户）**：
- API 调用：¥1,200/月（1000 用户）
- 云服务器：¥1,000-2,000/月
- 总成本：¥2,200-3,200/月
- 单用户成本：¥2.2-3.2/月

**成本优势**：
- 无需 GPU 服务器（节省 ¥10,000+/月）
- 按需付费，弹性扩展
- 零运维成本

---

## 安全与合规

### 1. 数据安全
- HTTPS/WSS 加密传输
- 数据库加密存储
- 敏感信息脱敏

### 2. 儿童隐私保护
- 符合《儿童个人信息网络保护规定》
- 家长授权机制
- 数据最小化原则

### 3. 内容安全
- 敏感词过滤
- 不当内容检测
- 家长审核日志

---

## 阶段演进

### 阶段一：Android App + 云端（3个月）
- Android App 开发
- HTTP 代理（云服务）
- Gateway + child-doll Agent
- 基础 Memory

### 阶段二：嵌入式设备 + 玩偶（6个月）
- 树莓派 Zero 2W 开发
- 玩偶外壳设计
- 音频优化
- Canvas 小脸

### 阶段三：多设备 + 规模化（12个月）
- 自建 HTTP 代理
- 自建 LLM 推理
- 多设备同步
- parent 控制面板

### 阶段四：成人版 + 个性化（18个月）
- 多 SOUL 配置
- 更复杂对话
- 情感陪伴功能
