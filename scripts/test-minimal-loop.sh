#!/bin/bash

# 最小闭环测试脚本
# 用途：测试 OpenClaw + Claude Code + Hooks 协作

set -e

PROJECT_DIR="$HOME/ghp/Guojiajia"
cd "$PROJECT_DIR"

echo "🚀 开始最小闭环测试"
echo "===================="
echo ""

# 步骤 1: 验证测试失败（因为还没有实现代码）
echo "📋 步骤 1: 验证测试失败（预期行为）"
if npm test 2>/dev/null; then
  echo "❌ 错误：测试应该失败（代码还未实现）"
  exit 1
else
  echo "✅ 测试失败（符合预期）"
fi
echo ""

# 步骤 2: 使用 Claude Code 生成代码
echo "📋 步骤 2: 调用 Claude Code 生成代码"
echo "任务: 实现 src/register.js，满足测试要求"
echo ""

# 创建任务描述文件
cat > /tmp/claude-task.txt <<EOF
请实现 src/register.js 文件，满足以下测试要求：

1. 导出 registerUser(email, password) 函数
2. 验证邮箱格式（必须包含 @）
3. 验证密码长度（至少 6 位）
4. 成功时返回 { success: true, userId: <随机ID> }
5. 失败时返回 { success: false, error: <错误信息> }

测试文件位于: tests/register.test.js
EOF

echo "任务描述已创建: /tmp/claude-task.txt"
echo ""

# 步骤 3: 手动调用 Claude Code（因为我们在测试环境）
echo "📋 步骤 3: 生成代码（模拟 Claude Code）"
echo "提示：在实际环境中，这里会调用："
echo "  claude --permission-mode bypassPermissions --print '\$(cat /tmp/claude-task.txt)'"
echo ""
echo "现在我们手动创建代码来模拟..."

# 创建实现代码（模拟 Claude Code 输出）
cat > src/register.js <<'EOF'
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
EOF

echo "✅ 代码已生成: src/register.js"
echo ""

# 步骤 4: 触发 Hook（模拟）
echo "📋 步骤 4: 触发 PostToolUse Hook"
export HOOK_TOOL="write"
export HOOK_FILE_PATH="src/register.js"

if node .claude/hooks/post-tool-use.js write src/register.js; then
  echo "✅ Hook 执行成功"
else
  echo "❌ Hook 执行失败"
  exit 1
fi
echo ""

# 步骤 5: 验证最终结果
echo "📋 步骤 5: 验证最终结果"
if npm test; then
  echo "✅ 所有测试通过！"
else
  echo "❌ 测试失败"
  exit 1
fi
echo ""

# 步骤 6: 查看 Hook 日志
echo "📋 步骤 6: 查看 Hook 日志"
if [ -f .claude/hook-log.txt ]; then
  echo "Hook 日志内容:"
  cat .claude/hook-log.txt
else
  echo "⚠️  Hook 日志文件不存在"
fi
echo ""

echo "===================="
echo "🎉 最小闭环测试完成！"
echo ""
echo "验证的流程:"
echo "1. ✅ 测试失败（代码未实现）"
echo "2. ✅ 生成代码（模拟 Claude Code）"
echo "3. ✅ Hook 自动触发"
echo "4. ✅ 自动运行测试"
echo "5. ✅ 测试通过"
echo "6. ✅ 记录日志"
