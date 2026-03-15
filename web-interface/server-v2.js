#!/usr/bin/env node

/**
 * OpenClaw ↔ Claude Code 对话服务器 v2
 * 支持流式输出，实时显示 Claude Code 工作过程
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3000;
const PROJECT_DIR = path.join(__dirname, '..');
const HISTORY_FILE = path.join(__dirname, 'chat-history.json');

// 对话历史
let chatHistory = [];

// 加载历史记录
function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf8');
      chatHistory = JSON.parse(data);
      console.log(`📚 已加载 ${chatHistory.length} 条历史记录`);
    }
  } catch (error) {
    console.error('加载历史记录失败:', error.message);
    chatHistory = [];
  }
}

// 保存历史记录
function saveHistory() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
  } catch (error) {
    console.error('保存历史记录失败:', error.message);
  }
}

// 添加消息到历史
function addToHistory(sender, content) {
  const message = {
    sender,
    content,
    timestamp: new Date().toISOString()
  };
  chatHistory.push(message);
  saveHistory();
  return message;
}

// 启动时加载历史
loadHistory();

// SSE 客户端连接
const sseClients = [];

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // 路由处理
  if (req.url === '/' || req.url === '/index.html') {
    // 返回 HTML 页面
    const html = fs.readFileSync(path.join(__dirname, 'index-v2.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    
  } else if (req.url === '/api/stream') {
    // SSE 连接
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // 添加客户端
    sseClients.push(res);
    
    // 发送初始消息
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    
    // 发送历史记录
    chatHistory.forEach(msg => {
      res.write(`data: ${JSON.stringify({ 
        type: 'message', 
        sender: msg.sender, 
        content: msg.content,
        timestamp: msg.timestamp
      })}\n\n`);
    });
    
    // 客户端断开时移除
    req.on('close', () => {
      const index = sseClients.indexOf(res);
      if (index !== -1) {
        sseClients.splice(index, 1);
      }
    });
    
  } else if (req.url === '/api/chat' && req.method === 'POST') {
    // 处理聊天请求
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body);
        
        console.log(`[用户] ${message}`);
        
        // 添加到历史并广播
        const userMsg = addToHistory('user', message);
        broadcast({
          type: 'message',
          sender: userMsg.sender,
          content: userMsg.content,
          timestamp: userMsg.timestamp
        });
        
        // 广播 OpenClaw 转发消息
        const openclawMsg = addToHistory('openclaw', '收到任务，正在转发给 Claude Code...');
        broadcast({
          type: 'message',
          sender: openclawMsg.sender,
          content: openclawMsg.content,
          timestamp: openclawMsg.timestamp
        });
        
        // 调用 Claude Code（流式）
        await callClaudeCodeStreaming(message);
        
        // 返回成功
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        
      } catch (error) {
        console.error('[错误]', error.message);
        
        broadcast({
          type: 'error',
          content: error.message,
          timestamp: new Date().toISOString()
        });
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
    
  } else {
    // 404
    res.writeHead(404);
    res.end('Not Found');
  }
});

/**
 * 广播消息给所有 SSE 客户端
 */
function broadcast(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(message);
    } catch (err) {
      // 忽略写入错误
    }
  });
}

/**
 * 调用 Claude Code（流式输出）
 */
async function callClaudeCodeStreaming(message) {
  return new Promise((resolve, reject) => {
    const claudePath = '/Users/robot/.bun/bin/claude';
    
    // 启动 Claude Code 进程
    const proc = spawn(claudePath, [
      '--permission-mode', 'bypassPermissions',
      '--print'
    ], {
      cwd: PROJECT_DIR,
      env: { ...process.env, PATH: process.env.PATH + ':/Users/robot/.bun/bin' }
    });
    
    // 发送消息
    proc.stdin.write(message + '\n');
    proc.stdin.end();
    
    let output = '';
    let errorOutput = '';
    
    // 捕获标准输出（实时）
    proc.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      
      // 实时广播
      broadcast({
        type: 'stream',
        sender: 'claude',
        content: chunk,
        timestamp: new Date().toISOString()
      });
      
      console.log(`[Claude Code] ${chunk}`);
    });
    
    // 捕获错误输出
    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    // 进程结束
    proc.on('close', (code) => {
      if (code === 0) {
        // 添加到历史
        const claudeMsg = addToHistory('claude', output.trim());
        
        // 发送完成消息
        broadcast({
          type: 'complete',
          sender: claudeMsg.sender,
          content: claudeMsg.content,
          timestamp: claudeMsg.timestamp
        });
        
        resolve(output.trim());
      } else {
        reject(new Error(`Claude Code 执行失败 (code ${code}): ${errorOutput}`));
      }
    });
    
    // 超时处理
    setTimeout(() => {
      proc.kill();
      reject(new Error('Claude Code 执行超时'));
    }, 300000); // 5 分钟
  });
}

// 启动服务器
server.listen(PORT, () => {
  console.log('');
  console.log('🚀 OpenClaw ↔ Claude Code 对话服务器 v2 已启动');
  console.log('');
  console.log(`   访问地址: http://localhost:${PORT}`);
  console.log(`   项目目录: ${PROJECT_DIR}`);
  console.log('');
  console.log('📝 新功能:');
  console.log('   - ✨ 实时流式输出');
  console.log('   - 👀 查看 Claude Code 工作过程');
  console.log('   - 🔄 Server-Sent Events (SSE)');
  console.log('');
  console.log('按 Ctrl+C 停止服务器');
  console.log('');
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n\n👋 服务器已停止');
  process.exit(0);
});
