#!/usr/bin/env node

/**
 * PostToolUse Hook
 * 在 Claude Code 使用工具后自动触发
 * 用于自动测试、日志记录等
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 获取环境变量
const tool = process.env.HOOK_TOOL || 'unknown';
const filePath = process.env.HOOK_FILE_PATH || '';
const projectDir = process.cwd();

console.log(`[Hook] PostToolUse triggered`);
console.log(`[Hook] Tool: ${tool}`);
console.log(`[Hook] File: ${filePath}`);

// 日志文件
const logFile = path.join(projectDir, '.claude', 'hook-log.txt');

// 确保日志目录存在
const logDir = path.dirname(logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 记录日志
const timestamp = new Date().toISOString();
const logEntry = `${timestamp} - PostToolUse - ${tool} - ${filePath}\n`;
fs.appendFileSync(logFile, logEntry);

// 如果是代码文件修改，自动运行测试
if (tool === 'write' && filePath) {
  const ext = path.extname(filePath);
  
  // 如果是 JS 文件，运行测试
  if (ext === '.js') {
    console.log('[Hook] 检测到代码文件修改，自动运行测试...');
    
    try {
      // 运行测试
      execSync('npm test', { 
        cwd: projectDir,
        stdio: 'inherit'
      });
      
      // 记录成功
      fs.appendFileSync(logFile, `${timestamp} - 测试通过 ✓\n`);
      console.log('[Hook] 测试通过 ✓');
      
    } catch (error) {
      // 记录失败
      fs.appendFileSync(logFile, `${timestamp} - 测试失败 ✗\n`);
      console.error('[Hook] 测试失败 ✗');
      process.exit(1);
    }
  }
}

console.log('[Hook] 执行完成');
