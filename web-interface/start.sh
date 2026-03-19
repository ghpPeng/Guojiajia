#!/bin/bash

# Claude Code Web Relay v3 - 启动脚本
# 支持 Bridge 模式，OpenClaw 作为中间人

cd "$(dirname "$0")"

echo "🚀 启动 Claude Code Web Relay v3..."
echo ""

# 检查端口是否被占用
if curl -s http://localhost:3000/ > /dev/null 2>&1; then
    echo "⚠️  端口 3000 已被占用，尝试关闭旧进程..."
    pkill -f "server.js" 2>/dev/null
    pkill -f "server-v3.js" 2>/dev/null
    pkill -f "server-v2.js" 2>/dev/null
    pkill -f "server-openclaw-bridge.js" 2>/dev/null
    sleep 2
fi

# 启动服务器
nohup node server.js > server.log 2>&1 &

# 等待服务器启动
echo "⏳ 等待服务器启动..."
sleep 3

# 检查是否启动成功
if curl -s http://localhost:3000/ > /dev/null 2>&1; then
    echo "✅ Web Relay 启动成功！"
    echo ""
    echo "🌐 访问地址: http://localhost:3000"
    echo ""
    echo "💡 使用方式:"
    echo "   1. 在浏览器中打开 http://localhost:3000"
    echo "   2. 或在 DingTalk 中让 Toyleader 转发任务"
    echo ""
    echo "📋 API 端点:"
    echo "   - GET  /              - Web 界面"
    echo "   - GET  /api/stream    - SSE 实时流"
    echo "   - POST /api/bridge    - OpenClaw 调用 (Bridge 模式)"
    echo "   - POST /api/chat      - 浏览器直接调用"
    echo "   - GET  /api/history   - 历史记录"
    echo ""
    echo "📝 日志文件: ./server.log"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo "❌ 启动失败，请检查 server.log"
    exit 1
fi
