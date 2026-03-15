/**
 * Memory System Tests
 * Phase 1: L1 (Redis/In-memory) tests
 */

const MemoryManager = require('../src/memory');
const RedisLayer = require('../src/memory/redis-layer');

(async () => {
  const redis = new RedisLayer();

  // Test 1: set and get
  await redis.set('dev_001', 'name', 'Alice');
  const name = await redis.get('dev_001', 'name');
  if (name !== 'Alice') throw new Error('Test 1 failed');

  // Test 2: get all data
  await redis.set('dev_002', 'intimacy', { level: 5, points: 1250 });
  const all = await redis.get('dev_002');
  if (!all.intimacy || all.intimacy.level !== 5) throw new Error('Test 2 failed');

  // Test 3: update numeric
  await redis.set('dev_003', 'score', 100);
  await redis.update('dev_003', 'score', 50);
  const score = await redis.get('dev_003', 'score');
  if (score !== 150) throw new Error('Test 3 failed');

  // Test 4: update object
  await redis.set('dev_004', 'learning', { math: { progress: 0.3 } });
  await redis.update('dev_004', 'learning', { english: { progress: 0.2 } });
  const learning = await redis.get('dev_004', 'learning');
  if (!learning.math || !learning.english) throw new Error('Test 4 failed');

  // Test 5: delete key
  await redis.set('dev_005', 'temp', 'value');
  await redis.delete('dev_005', 'temp');
  const temp = await redis.get('dev_005', 'temp');
  if (temp !== undefined) throw new Error('Test 5 failed');

  // Test 6: flush
  await redis.set('dev_006', 'data', 'test');
  await redis.flush('dev_006');
  const flushed = await redis.get('dev_006');
  if (flushed !== null) throw new Error('Test 6 failed');

  // MemoryManager tests
  const memory = new MemoryManager();

  // Test 7: validation
  try {
    await memory.get(null, 'key');
    throw new Error('Test 7 failed - should throw');
  } catch (err) {
    if (!err.message.includes('device_id required')) throw new Error('Test 7 failed');
  }

  // Test 8: set and get
  await memory.set('dev_100', 'intimacy', { level: 3, points: 500 });
  const intimacy = await memory.get('dev_100', 'intimacy');
  if (intimacy.level !== 3) throw new Error('Test 8 failed');

  // Test 9: getAll
  await memory.set('dev_101', 'learning', { math: { progress: 0.5 } });
  await memory.set('dev_101', 'stories', ['story1']);
  const allData = await memory.getAll('dev_101');
  if (!allData.learning || !allData.stories) throw new Error('Test 9 failed');

  // Test 10: update
  await memory.set('dev_102', 'points', 100);
  await memory.update('dev_102', 'points', 25);
  const points = await memory.get('dev_102', 'points');
  if (points !== 125) throw new Error('Test 10 failed');

  console.log('  ✓ All 10 tests passed');
})();
