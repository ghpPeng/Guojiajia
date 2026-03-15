/**
 * 历史记录功能测试
 */

const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '..', 'web-interface', 'chat-history.json');

// 模拟历史记录功能
function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('加载失败:', error.message);
    return [];
  }
}

function saveHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    return true;
  } catch (error) {
    console.error('保存失败:', error.message);
    return false;
  }
}

function addToHistory(history, sender, content) {
  const message = {
    sender,
    content,
    timestamp: new Date().toISOString()
  };
  history.push(message);
  return message;
}

// 测试
console.log('🧪 测试历史记录功能\n');

// 1. 清空测试
if (fs.existsSync(HISTORY_FILE)) {
  fs.unlinkSync(HISTORY_FILE);
  console.log('✓ 清空旧数据');
}

// 2. 保存测试
let history = [];
addToHistory(history, 'user', '你好');
addToHistory(history, 'claude', '你好！有什么可以帮你的？');
const saved = saveHistory(history);
console.log(saved ? '✓ 保存成功' : '✗ 保存失败');

// 3. 加载测试
const loaded = loadHistory();
console.log(loaded.length === 2 ? '✓ 加载成功' : '✗ 加载失败');
console.log(`  记录数: ${loaded.length}`);

// 4. 追加测试
addToHistory(loaded, 'user', '测试历史记录');
saveHistory(loaded);
const reloaded = loadHistory();
console.log(reloaded.length === 3 ? '✓ 追加成功' : '✗ 追加失败');

// 5. 显示内容
console.log('\n📚 历史记录内容:');
reloaded.forEach((msg, i) => {
  console.log(`  ${i + 1}. [${msg.sender}] ${msg.content}`);
});

console.log('\n✅ 测试完成');
