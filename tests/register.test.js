/**
 * 用户注册功能测试
 */

const assert = require('assert');

// 简单的断言函数
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.log(`  ✗ ${name}`);
    throw error;
  }
}

console.log('测试: 用户注册功能');

// 测试 1: 模块存在
test('应该能导入 register 模块', () => {
  try {
    const register = require('../src/register');
    assert(register, '模块应该存在');
  } catch (error) {
    // 如果文件不存在，测试失败
    throw new Error('register.js 文件不存在');
  }
});

// 测试 2: 函数存在
test('应该导出 registerUser 函数', () => {
  const register = require('../src/register');
  assert(typeof register.registerUser === 'function', 'registerUser 应该是函数');
});

// 测试 3: 基本功能
test('应该能注册新用户', () => {
  const register = require('../src/register');
  const result = register.registerUser('test@example.com', 'password123');
  assert(result.success === true, '注册应该成功');
  assert(result.userId, '应该返回用户ID');
});

// 测试 4: 验证邮箱
test('应该验证邮箱格式', () => {
  const register = require('../src/register');
  const result = register.registerUser('invalid-email', 'password123');
  assert(result.success === false, '无效邮箱应该失败');
  assert(result.error, '应该返回错误信息');
});

// 测试 5: 验证密码长度
test('应该验证密码长度', () => {
  const register = require('../src/register');
  const result = register.registerUser('test@example.com', '123');
  assert(result.success === false, '短密码应该失败');
  assert(result.error.includes('密码'), '错误信息应该提到密码');
});
