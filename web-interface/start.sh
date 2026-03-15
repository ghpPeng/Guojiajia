#!/bin/bash

# OpenClaw ↔ Claude Code Web 对话界面启动脚本

cd "$(dirname "$0")"

echo ""
echo "🚀 启动 OpenClaw ↔ Claude Code 对话界面..."
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "❌ 错误: 未找到 Node.js"
  echo "请先安装 Node.js: https://nodejs.org/"
  exit 1
fi

# 检查端口
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "⚠️  警告: 端口 3000 已被占用"
  echo ""
  read -p "是否终止占用进程并继续? (y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    echo "✅ 已终止占用进程"
  else
    echo "❌ 已取消启动"
    exit 1
  fi
fi

echo ""
echo "📝 启动信息:"
echo "   - 访问地址: http://localhost:3000"
echo "   - 项目目录: $(pwd)/.."
echo "   - 日志文件: ./server.log"
echo ""
echo "💡 提示:"
echo "   - 在浏览器中打开 http://localhost:3000"
echo "   - 按 Ctrl+C 停止服务器"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 启动服务器
node server.js 2>&1 | tee server.log
