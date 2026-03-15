#!/bin/bash

# Claude Code 自主执行脚本
# 用途：读取改进计划，自动执行任务

set -e

PROJECT_DIR="$HOME/ghp/Guojiajia"
cd "$PROJECT_DIR"

echo "🤖 Claude Code 自主执行模式"
echo "=============================="
echo ""

# 读取配置
CONFIG_FILE=".claude/config.json"
if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ 配置文件不存在: $CONFIG_FILE"
  exit 1
fi

PLAN_FILE=$(cat "$CONFIG_FILE" | grep -o '"plan_file": "[^"]*"' | cut -d'"' -f4)
MAX_TASKS=$(cat "$CONFIG_FILE" | grep -o '"max_tasks_per_run": [0-9]*' | grep -o '[0-9]*')

echo "📋 计划文件: $PLAN_FILE"
echo "🎯 最大任务数: $MAX_TASKS"
echo ""

# 检查计划文件
if [ ! -f "$PLAN_FILE" ]; then
  echo "❌ 计划文件不存在: $PLAN_FILE"
  exit 1
fi

# 提取待办任务
echo "🔍 扫描待办任务..."
PENDING_TASKS=$(grep -n "^- \[ \]" "$PLAN_FILE" | head -n "$MAX_TASKS")

if [ -z "$PENDING_TASKS" ]; then
  echo "✅ 所有任务已完成！"
  exit 0
fi

echo "发现待办任务:"
echo "$PENDING_TASKS"
echo ""

# 逐个执行任务
TASK_COUNT=0
while IFS= read -r line; do
  TASK_COUNT=$((TASK_COUNT + 1))
  
  # 提取任务名称
  TASK_NAME=$(echo "$line" | sed 's/^[0-9]*:- \[ \] //' | sed 's/ *$//')
  
  echo "=============================="
  echo "📌 任务 $TASK_COUNT: $TASK_NAME"
  echo "=============================="
  echo ""
  
  # 调用 pre-task hook
  export TASK_NAME="$TASK_NAME"
  node .claude/hooks/pre-task.js "$TASK_NAME"
  
  # 调用 Claude Code 执行任务
  echo "🚀 调用 Claude Code..."
  if claude --permission-mode bypassPermissions --print "执行任务: $TASK_NAME

请根据 IMPROVEMENT-PLAN.md 中的任务描述，完成以下工作:
1. 创建测试文件（如果需要）
2. 实现功能代码
3. 确保所有测试通过
4. 生成必要的文档

任务名称: $TASK_NAME
"; then
    echo "✅ 任务完成"
    
    # 调用 post-task hook
    node .claude/hooks/post-task.js "$TASK_NAME"
  else
    echo "❌ 任务失败"
    
    # 调用 on-error hook
    export ERROR_MSG="Claude Code 执行失败"
    node .claude/hooks/on-error.js "$TASK_NAME" "$ERROR_MSG"
    
    exit 1
  fi
  
  echo ""
  
done <<< "$PENDING_TASKS"

# 生成执行报告
echo "=============================="
echo "📊 生成执行报告..."
echo "=============================="

cat > AUTONOMOUS-REPORT.md <<EOF
# 自主执行报告

**执行时间**: $(date '+%Y-%m-%d %H:%M:%S')
**执行任务数**: $TASK_COUNT

## 任务日志

\`\`\`json
$(cat .claude/task-log.json)
\`\`\`

## 测试结果

\`\`\`
$(npm test 2>&1)
\`\`\`

## 下一步

$(grep -A 5 "^## 🚀 下一步行动" IMPROVEMENT-PLAN.md || echo "无")
EOF

echo "✅ 报告已生成: AUTONOMOUS-REPORT.md"
echo ""
echo "🎉 自主执行完成！"
