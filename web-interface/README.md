# OpenClaw ↔ Claude Code Web 对话界面

实时查看和干预 OpenClaw 与 Claude Code 的协作过程

---

## 🚀 快速启动

### 方式 1：使用启动脚本（推荐）

```bash
cd ~/ghp/Guojiajia/web-interface
./start.sh
```

### 方式 2：直接运行

```bash
cd ~/ghp/Guojiajia/web-interface
node server.js
```

---

## 🌐 访问

启动后，在浏览器中打开：

```
http://localhost:3000
```

---

## 💡 功能

### 1. 实时对话
- 你的消息（蓝色气泡）
- OpenClaw 转发（橙色边框）
- Claude Code 响应（绿色边框）

### 2. 发送任务
在输入框输入任务，例如：
- "修复 Memory 测试兼容性问题"
- "实现认证授权模块"
- "查看项目状态"

### 3. 查看过程
实时看到：
- OpenClaw 接收任务
- 转发给 Claude Code
- Claude Code 的工作过程
- 执行结果

---

## 📁 文件说明

```
web-interface/
├── start.sh          # 启动脚本
├── server.js         # Node.js 服务器
├── index.html        # Web 界面
├── server.log        # 运行日志
└── README.md         # 本文件
```

---

## 🔧 配置

### 修改端口

编辑 `server.js`，修改：

```javascript
const PORT = 3000;  // 改成你想要的端口
```

### 修改项目目录

编辑 `server.js`，修改：

```javascript
const PROJECT_DIR = path.join(__dirname, '..');
```

---

## 🐛 故障排除

### 端口被占用

```bash
# 查看占用端口的进程
lsof -i :3000

# 终止进程
kill -9 <PID>
```

### 服务器无响应

```bash
# 查看日志
tail -f ~/ghp/Guojiajia/web-interface/server.log
```

### Claude Code 调用失败

确保 Claude Code CLI 已安装：

```bash
which claude
# 应该输出: /Users/robot/.bun/bin/claude
```

---

## 📊 API 接口

### POST /api/chat

发送消息给 Claude Code

**请求**:
```json
{
  "message": "你的任务"
}
```

**响应**:
```json
{
  "success": true,
  "response": "Claude Code 的响应"
}
```

### GET /api/history

获取对话历史

**响应**:
```json
{
  "success": true,
  "history": [
    {
      "sender": "user",
      "content": "消息内容",
      "timestamp": "2026-03-15T03:30:00.000Z"
    }
  ]
}
```

---

## 🎯 使用示例

### 1. 启动服务

```bash
cd ~/ghp/Guojiajia/web-interface
./start.sh
```

### 2. 打开浏览器

访问 `http://localhost:3000`

### 3. 发送任务

在输入框输入：
```
修复 Memory 测试兼容性问题
```

### 4. 查看过程

你会实时看到：
```
[你] 修复 Memory 测试兼容性问题
  ↓
[OpenClaw] 收到任务，正在转发给 Claude Code...
  ↓
[Claude Code] 我来分析一下问题...
              发现新的数据验证与旧测试不兼容...
              正在更新测试用例...
              ✅ 测试已通过
```

---

## 🛑 停止服务

在终端按 `Ctrl+C`

---

## 💡 提示

1. **保持终端打开**：服务器需要在终端中运行
2. **查看日志**：所有输出都会保存到 `server.log`
3. **多次使用**：可以随时启动和停止

---

## 📝 下一步

现在你可以：

1. **启动服务**
   ```bash
   cd ~/ghp/Guojiajia/web-interface
   ./start.sh
   ```

2. **打开浏览器**
   访问 `http://localhost:3000`

3. **开始对话**
   发送任务给 Claude Code，实时查看工作过程

---

**祝使用愉快！** 🎉
