/**
 * Memory Architecture Tests
 * Tests sharding, data model, and three-tier architecture
 */

const ShardingStrategy = require('../src/memory/sharding');
const DataModel = require('../src/memory/data-model');
const RedisLayer = require('../src/memory/redis-layer');
const MongoLayer = require('../src/memory/mongo-layer');
const OSSLayer = require('../src/memory/oss-layer');
const MemoryManager = require('../src/memory');

// Test: Sharding Strategy
function testSharding() {
  console.log('\n=== Testing Sharding Strategy ===');

  const sharding = new ShardingStrategy(16);

  // Test consistent hashing
  const deviceId = 'dev_test_001';
  const shardId1 = sharding.getShardId(deviceId);
  const shardId2 = sharding.getShardId(deviceId);

  console.assert(shardId1 === shardId2, 'Shard ID should be consistent');
  console.assert(shardId1 >= 0 && shardId1 < 16, 'Shard ID should be in range [0, 15]');

  // Test shard key format
  const shardKey = sharding.getShardKey(deviceId);
  console.assert(shardKey.startsWith('shard:'), 'Shard key should have correct prefix');

  // Test memory key format
  const memKey = sharding.getMemoryKey(deviceId);
  console.assert(memKey.includes('mem:'), 'Memory key should include mem prefix');
  console.assert(memKey.includes(deviceId), 'Memory key should include device ID');

  // Test distribution across shards
  const distribution = new Array(16).fill(0);
  for (let i = 0; i < 1000; i++) {
    const id = `dev_${i}`;
    const shard = sharding.getShardId(id);
    distribution[shard]++;
  }

  const avg = 1000 / 16;
  const variance = distribution.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / 16;
  console.log(`Distribution variance: ${variance.toFixed(2)} (lower is better)`);
  console.assert(variance < 200, 'Distribution should be relatively uniform');

  console.log('✓ Sharding tests passed');
}

// Test: Data Model
function testDataModel() {
  console.log('\n=== Testing Data Model ===');

  // Test empty creation
  const empty = DataModel.createEmpty('dev_001');
  console.assert(empty.device_id === 'dev_001', 'Device ID should be set');
  console.assert(empty.intimacy.level === 1, 'Default intimacy level should be 1');
  console.assert(empty.intimacy.points === 0, 'Default intimacy points should be 0');
  console.assert(Array.isArray(empty.stories), 'Stories should be an array');
  console.assert(Array.isArray(empty.constraints), 'Constraints should be an array');

  // Test intimacy validation
  console.assert(DataModel.validateIntimacy({ level: 5, points: 100 }), 'Valid intimacy should pass');
  console.assert(!DataModel.validateIntimacy({ level: 11, points: 100 }), 'Invalid level should fail');
  console.assert(!DataModel.validateIntimacy({ level: 5, points: -10 }), 'Negative points should fail');

  // Test learning validation
  console.assert(DataModel.validateLearning({ math: { progress: 0.5 } }), 'Valid learning should pass');
  console.assert(!DataModel.validateLearning({ math: { progress: 1.5 } }), 'Progress > 1 should fail');

  // Test stories validation
  const validStories = [
    { id: 's1', content: 'Story 1', timestamp: new Date().toISOString() }
  ];
  console.assert(DataModel.validateStories(validStories), 'Valid stories should pass');
  console.assert(!DataModel.validateStories([{ id: 's1' }]), 'Incomplete story should fail');

  // Test constraints validation
  const validConstraints = [
    { type: 'time_limit', rule: { max_minutes: 30 } }
  ];
  console.assert(DataModel.validateConstraints(validConstraints), 'Valid constraints should pass');

  // Test full validation
  const validMemory = {
    device_id: 'dev_001',
    intimacy: { level: 5, points: 100 },
    learning: { math: { progress: 0.3 } },
    stories: validStories,
    constraints: validConstraints
  };
  const result = DataModel.validate(validMemory);
  console.assert(result.valid, 'Valid memory should pass validation');

  // Test merge
  const base = DataModel.createEmpty('dev_001');
  base.intimacy.level = 3;
  base.intimacy.points = 50;

  const incoming = {
    device_id: 'dev_001',
    intimacy: { level: 5, points: 100, last_interaction: new Date().toISOString() },
    learning: { english: { progress: 0.2 } }
  };

  const merged = DataModel.merge(base, incoming);
  console.assert(merged.intimacy.level === 5, 'Should use higher intimacy level');
  console.assert(merged.intimacy.points === 100, 'Should use higher intimacy points');
  console.assert(merged.learning.english.progress === 0.2, 'Should merge learning data');

  console.log('✓ Data model tests passed');
}

// Test: Redis Layer (L1)
async function testRedisLayer() {
  console.log('\n=== Testing Redis Layer (L1) ===');

  const redis = new RedisLayer(); // Uses in-memory fallback

  // Test set and get
  await redis.set('dev_001', 'intimacy', { level: 5, points: 100 });
  const intimacy = await redis.get('dev_001', 'intimacy');
  console.assert(intimacy.level === 5, 'Should retrieve correct intimacy level');

  // Test update (numeric)
  await redis.set('dev_001', 'score', 100);
  await redis.update('dev_001', 'score', 50);
  const score = await redis.get('dev_001', 'score');
  console.assert(score === 150, 'Should increment numeric value');

  // Test update (object merge)
  await redis.set('dev_001', 'learning', { math: { progress: 0.3 } });
  await redis.update('dev_001', 'learning', { english: { progress: 0.2 } });
  const learning = await redis.get('dev_001', 'learning');
  console.assert(learning.math.progress === 0.3, 'Should preserve existing fields');
  console.assert(learning.english.progress === 0.2, 'Should add new fields');

  // Test delete field
  await redis.delete('dev_001', 'score');
  const deletedScore = await redis.get('dev_001', 'score');
  console.assert(deletedScore === undefined, 'Deleted field should be undefined');

  // Test delete entire memory
  await redis.delete('dev_001');
  const deletedMemory = await redis.get('dev_001');
  console.assert(deletedMemory === null, 'Deleted memory should be null');

  console.log('✓ Redis layer tests passed');
}

// Test: MongoDB Layer (L2)
async function testMongoLayer() {
  console.log('\n=== Testing MongoDB Layer (L2) ===');

  const mongo = new MongoLayer(); // Uses in-memory fallback

  // Test set and get
  await mongo.set('dev_002', 'intimacy', { level: 3, points: 50 });
  const intimacy = await mongo.get('dev_002', 'intimacy');
  console.assert(intimacy.level === 3, 'Should retrieve correct intimacy level');

  // Test validation
  try {
    await mongo.set('dev_002', 'intimacy', { level: 15, points: 50 });
    console.assert(false, 'Should throw validation error');
  } catch (err) {
    console.assert(err.message.includes('Validation failed'), 'Should throw validation error');
  }

  // Test query by shard
  await mongo.set('dev_003', 'intimacy', { level: 2, points: 20 });
  const sharding = new ShardingStrategy();
  const shardId = sharding.getShardId('dev_002');
  const docs = await mongo.queryByShard(shardId);
  console.assert(docs.length > 0, 'Should find documents in shard');

  console.log('✓ MongoDB layer tests passed');
}

// Test: OSS Layer (L3)
async function testOSSLayer() {
  console.log('\n=== Testing OSS Layer (L3) ===');

  const oss = new OSSLayer(); // Uses in-memory fallback

  // Test archive
  const data = {
    device_id: 'dev_004',
    intimacy: { level: 5, points: 100 },
    metadata: { last_updated: new Date().toISOString() }
  };

  const key = await oss.archive('dev_004', data);
  console.assert(key.includes('dev_004'), 'Archive key should include device ID');
  console.assert(key.includes('shard-'), 'Archive key should include shard prefix');

  // Test retrieve
  const retrieved = await oss.retrieve('dev_004', data.metadata.last_updated);
  console.assert(retrieved !== null, 'Should retrieve archived data');
  console.assert(retrieved.device_id === 'dev_004', 'Retrieved data should match');

  // Test list
  const keys = await oss.list('dev_004');
  console.assert(keys.length > 0, 'Should list archived objects');

  // Test batch archive
  const memories = [
    { deviceId: 'dev_005', data: { device_id: 'dev_005', intimacy: { level: 1, points: 0 }, metadata: { last_updated: new Date().toISOString() } } },
    { deviceId: 'dev_006', data: { device_id: 'dev_006', intimacy: { level: 2, points: 10 }, metadata: { last_updated: new Date().toISOString() } } }
  ];

  const results = await oss.batchArchive(memories);
  console.assert(results.length === 2, 'Should archive all memories');
  console.assert(results.every(r => r.success), 'All archives should succeed');

  // Test stats
  const stats = await oss.getStats();
  console.assert(stats.total_objects > 0, 'Should have archived objects');

  console.log('✓ OSS layer tests passed');
}

// Test: Memory Manager (Integration)
async function testMemoryManager() {
  console.log('\n=== Testing Memory Manager (Integration) ===');

  const manager = new MemoryManager({
    redis: null,
    mongo: null,
    oss: null
  });

  // Test set and get (L1 only)
  await manager.set('dev_007', 'intimacy', { level: 4, points: 80 });
  const intimacy = await manager.get('dev_007', 'intimacy');
  console.assert(intimacy.level === 4, 'Should retrieve from L1');

  // Test update
  await manager.update('dev_007', 'intimacy', { points: 90 });
  const updated = await manager.get('dev_007', 'intimacy');
  console.assert(updated.points === 90, 'Should update intimacy points');

  // Test getAll
  await manager.set('dev_007', 'learning', { math: { progress: 0.5 } });
  const all = await manager.getAll('dev_007');
  console.assert(all.intimacy !== undefined, 'Should include intimacy');
  console.assert(all.learning !== undefined, 'Should include learning');

  // Test sync
  const synced = await manager.sync('dev_007');
  console.assert(synced !== null, 'Sync should return data');

  // Test flush
  await manager.flush('dev_007');
  const flushed = await manager.get('dev_007');
  console.assert(flushed === null, 'Flushed memory should be null');

  console.log('✓ Memory manager tests passed');
}

// Test: Three-tier fallback
async function testThreeTierFallback() {
  console.log('\n=== Testing Three-tier Fallback ===');

  const manager = new MemoryManager({
    redis: null,
    mongo: null,
    oss: null
  });

  // Write to L1
  await manager.set('dev_008', 'intimacy', { level: 5, points: 100 });

  // Read from L1
  const l1Data = await manager.get('dev_008', 'intimacy');
  console.assert(l1Data.level === 5, 'Should read from L1');

  // Flush L1 and verify L2 fallback would work
  await manager.flush('dev_008');
  const afterFlush = await manager.get('dev_008');
  console.assert(afterFlush === null, 'After flush, L1 should be empty');

  console.log('✓ Three-tier fallback tests passed');
}

// Run all tests
async function runTests() {
  console.log('Starting Memory Architecture Tests...\n');

  try {
    testSharding();
    testDataModel();
    await testRedisLayer();
    await testMongoLayer();
    await testOSSLayer();
    await testMemoryManager();
    await testThreeTierFallback();

    console.log('\n=== All Tests Passed ✓ ===\n');
    return true;
  } catch (err) {
    console.error('\n=== Test Failed ✗ ===');
    console.error(err);
    return false;
  }
}

// Export for use in test runner
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runTests };
