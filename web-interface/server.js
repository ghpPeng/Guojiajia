#!/usr/bin/env node

/**
 * OpenClaw ↔ Claude Code 对话服务器
 * 提供 Web 界面，实时查看和干预对话
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 3000;
const PROJECT_DIR = path.join(__dirname, '..');

// 对话历史
const chatHistory = [];

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
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    
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
        
        // 添加到历史
        chatHistory.push({
          sender: 'user',
          content: message,
          timestamp: new Date().toISOString()
        });
        
        // 调用 Claude Code
        console.log('[OpenClaw] 转发给 Claude Code...');
        
        const response = await callClaudeCode(message);
        
        console.log(`[Claude Code] ${response.substring(0, 100)}...`);
        
        // 添加到历史
        chatHistory.push({
          sender: 'claude',
          content: response,
          timestamp: new Date().toISOString()
        });
        
        // 返回响应
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          response: response
        }));
        
      } catch (error) {
        console.error('[错误]', error.message);
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
    
  } else if (req.url === '/api/history') {
    // 返回对话历史
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      history: chatHistory
    }));
    
  } else {
    // 404
    res.writeHead(404);
    res.end('Not Found');
  }
});

/**
 * 调用 Claude Code
 */
async function callClaudeCode(message) {
  try {
    // 使用完整路径
    const claudePath = '/Users/robot/.bun/bin/claude';
    
    const result = execSync(
      `echo "${message}" | ${claudePath} --permission-mode bypassPermissions --print`,
      {
        cwd: PROJECT_DIR,
        encoding: 'utf8',
        timeout: 300000, // 5 分钟超时
        maxBuffer: 10 * 1024 * 1024, // 10MB
        env: { ...process.env, PATH: process.env.PATH + ':/Users/robot/.bun/bin' }
      }
    );
    
    return result.trim();
    
  } catch (error) {
    throw new Error(`Claude Code 执行失败: ${error.message}`);
  }
}

// 启动服务器
server.listen(PORT, () => {
  console.log('');
  console.log('🚀 OpenClaw ↔ Claude Code 对话服务器已启动');
  console.log('');
  console.log(`   访问地址: http://localhost:${PORT}`);
  console.log(`   项目目录: ${PROJECT_DIR}`);
  console.log('');
  console.log('📝 功能:');
  console.log('   - 实时查看 OpenClaw 和 Claude Code 的对话');
  console.log('   - 发送任务给 Claude Code');
  console.log('   - 查看执行过程和结果');
  console.log('');
  console.log('按 Ctrl+C 停止服务器');
  console.log('');
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n\n👋 服务器已停止');
  process.exit(0);
});
