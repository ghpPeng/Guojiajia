#!/usr/bin/env node

/**
 * 简单的测试运行器
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 运行测试...\n');

const testsDir = path.join(__dirname);
const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.js'));

let passed = 0;
let failed = 0;

testFiles.forEach(file => {
  console.log(`📝 ${file}`);
  try {
    require(path.join(testsDir, file));
    passed++;
    console.log(`  ✅ 通过\n`);
  } catch (error) {
    failed++;
    console.log(`  ❌ 失败: ${error.message}\n`);
  }
});

console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);

if (failed > 0) {
  process.exit(1);
}
