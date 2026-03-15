/**
 * 用户注册模块
 * 自动生成 by Claude Code
 */

/**
 * 注册新用户
 * @param {string} email - 用户邮箱
 * @param {string} password - 用户密码
 * @returns {Object} 注册结果
 */
function registerUser(email, password) {
  // 验证邮箱格式
  if (!email || !email.includes('@')) {
    return {
      success: false,
      error: '邮箱格式无效'
    };
  }

  // 验证密码长度
  if (!password || password.length < 6) {
    return {
      success: false,
      error: '密码长度至少 6 位'
    };
  }

  // 生成用户ID
  const userId = 'user_' + Math.random().toString(36).substr(2, 9);

  return {
    success: true,
    userId: userId
  };
}

module.exports = {
  registerUser
};
