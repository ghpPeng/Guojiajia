#!/usr/bin/env node

/**
 * Claude Code Web Relay v3 - Bridge Server
 * 支持 OpenClaw 作为中间人，将对话转发到 Web 界面
 * 
 * 工作流程：
 * 用户(DingTalk) → Toyleader(OpenClaw) → POST /api/bridge → 
 * 广播到浏览器 → 调用 Claude Code → 结果广播到浏览器
 * 
 * 版本: v3.0
 * 日期: 2026-03-15
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
    const htmlPath = path.join(__dirname, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    
  } else if (req.url === '/api/stream') {
    // SSE 连接 - 浏览器客户端连接
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
    
  } else if (req.url === '/api/bridge' && req.method === 'POST') {
    // OpenClaw Bridge API - 由 Toyleader 调用
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { user, message, task, webhook } = JSON.parse(body);
        
        console.log(`[Bridge] 收到来自 ${user} 的任务: ${message || task}`);
        if (webhook) {
          console.log(`[Bridge] Webhook 回调: ${webhook}`);
        }
        
        // 1. 添加用户消息到历史
        const userMsg = addToHistory('user', `[${user}] ${message || task}`);
        broadcast({
          type: 'message',
          sender: 'user',
          content: userMsg.content,
          timestamp: userMsg.timestamp
        });
        
        // 2. 添加 OpenClaw 消息
        const openclawMsg = addToHistory('openclaw', `收到任务，正在转发给 Claude Code...\n\n任务详情：${message || task}`);
        broadcast({
          type: 'message',
          sender: 'openclaw',
          content: openclawMsg.content,
          timestamp: openclawMsg.timestamp
        });
        
        // 3. 调用 Claude Code（流式）
        const result = await callClaudeCodeStreaming(message || task);
        
        // 4. 如果有 webhook，发送回调通知
        if (webhook) {
          try {
            const http = require('http');
            const url = new URL(webhook);
            const postData = JSON.stringify({
              success: true,
              user: user,
              result: result,
              message: 'Claude Code 任务已完成',
              timestamp: new Date().toISOString()
            });
            
            const options = {
              hostname: url.hostname,
              port: url.port || 80,
              path: url.pathname + url.search,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
              }
            };
            
            const req = http.request(options, (res) => {
              console.log(`[Webhook] 回调状态: ${res.statusCode}`);
            });
            
            req.on('error', (e) => {
              console.error(`[Webhook] 回调失败: ${e.message}`);
            });
            
            req.write(postData);
            req.end();
            
          } catch (webhookError) {
            console.error('[Webhook] 发送回调失败:', webhookError.message);
          }
        }
        
        // 返回成功
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          result,
          message: '任务已完成',
          webhook: webhook ? '已发送回调' : '无回调'
        }));
        
      } catch (error) {
        console.error('[Bridge Error]', error.message);
        
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
    
  } else if (req.url === '/api/chat' && req.method === 'POST') {
    // 兼容旧的 /api/chat 接口（浏览器直接调用）
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
    
  } else if (req.url === '/api/history') {
    // 获取历史记录
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      history: chatHistory
    }));
    
  } else if (req.url === '/api/clear' && req.method === 'POST') {
    // 清除历史记录
    chatHistory = [];
    saveHistory();
    broadcast({ type: 'clear' });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    
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
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    
    let output = '';
    
    // 发送开始消息
    const startMsg = addToHistory('claude', '⏳ Claude Code 正在处理...');
    broadcast({
      type: 'message',
      sender: 'claude',
      content: startMsg.content,
      timestamp: startMsg.timestamp,
      streaming: true
    });
    
    // 处理标准输出
    proc.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      
      // 广播流式输出
      broadcast({
        type: 'stream',
        content: chunk,
        timestamp: new Date().toISOString()
      });
    });
    
    // 处理标准错误
    proc.stderr.on('data', (data) => {
      const chunk = data.toString();
      console.error('[Claude stderr]', chunk);
    });
    
    // 处理进程结束
    proc.on('close', (code) => {
      if (code === 0) {
        // 成功完成
        const completeMsg = addToHistory('claude', output.trim());
        broadcast({
          type: 'complete',
          sender: 'claude',
          content: completeMsg.content,
          timestamp: completeMsg.timestamp
        });
        resolve(output.trim());
      } else {
        // 失败
        const errorMsg = `Claude Code 退出，代码: ${code}`;
        console.error('[错误]', errorMsg);
        addToHistory('system', `❌ ${errorMsg}`);
        broadcast({
          type: 'error',
          content: errorMsg,
          timestamp: new Date().toISOString()
        });
        reject(new Error(errorMsg));
      }
    });
    
    // 发送消息到 Claude Code
    proc.stdin.write(message + '\n');
    proc.stdin.end();
  });
}

// 启动服务器
server.listen(PORT, () => {
  console.log('🚀 Claude Code Web Relay v3 已启动');
  console.log('');
  console.log('📝 启动信息:');
  console.log(`   - 访问地址: http://localhost:${PORT}`);
  console.log(`   - 项目目录: ${PROJECT_DIR}`);
  console.log(`   - 历史文件: ${HISTORY_FILE}`);
  console.log('');
  console.log('✨ 功能:');
  console.log('   - Bridge 模式（OpenClaw 作为中间人）');
  console.log('   - 浏览器直接输入模式');
  console.log('   - 实时流式输出');
  console.log('   - Server-Sent Events (SSE)');
  console.log('');
  console.log('📋 API 端点:');
  console.log('   - POST /api/bridge - OpenClaw 调用');
  console.log('   - POST /api/chat  - 浏览器直接调用');
  console.log('   - GET  /api/stream - SSE 实时流');
  console.log('   - GET  /api/history - 历史记录');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});