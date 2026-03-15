# Web 对话界面更新日志

## v2.1 - 历史记录持久化 (2026-03-15)

### ✨ 新功能

1. **历史记录持久化**
   - 所有对话自动保存到 `chat-history.json`
   - 刷新页面后历史记录不会丢失
   - 服务器重启后自动加载历史

2. **自动加载历史**
   - 连接时自动推送历史记录
   - 无需手动刷新

### 📁 文件说明

- `chat-history.json` - 对话历史存储文件
- 格式：
  ```json
  [
    {
      "sender": "user",
      "content": "消息内容",
      "timestamp": "2026-03-15T04:08:00.000Z"
    }
  ]
  ```

### 🔧 使用方式

#### 查看历史

刷新浏览器页面，历史记录会自动加载。

#### 清除历史

```bash
# 方式 1: 删除文件
rm ~/ghp/Guojiajia/web-interface/chat-history.json

# 方式 2: 清空文件
echo "[]" > ~/ghp/Guojiajia/web-interface/chat-history.json

# 然后重启服务器
```

### 📊 存储位置

```
web-interface/
├── chat-history.json    # 对话历史（新增）
├── server-v2.js         # 服务器（已更新）
└── ...
```

---

## 🚀 升级步骤

1. **停止旧服务器**
   按 `Ctrl+C`

2. **启动新服务器**
   ```bash
   cd ~/ghp/Guojiajia/web-interface
   ./start-v2.sh
   ```

3. **刷新浏览器**
   历史记录会自动加载

---

## 💡 提示

- 历史记录会一直累积
- 如果历史太多，可以手动清除
- 每条消息都会立即保存

---

**现在重启服务器，历史记录就不会丢失了！** 🎉
