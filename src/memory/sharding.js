/**
 * Sharding Strategy - Consistent hashing for device_id
 * Supports 16 shards for 1000+ users
 */

const crypto = require('crypto');

class ShardingStrategy {
  constructor(shardCount = 16) {
    this.shardCount = shardCount;
  }

  /**
   * Calculate shard ID for a device
   * @param {string} deviceId - Device identifier
   * @returns {number} Shard ID (0-15)
   */
  getShardId(deviceId) {
    if (!deviceId) throw new Error('device_id required');

    const hash = crypto.createHash('md5').update(deviceId).digest('hex');
    const hashInt = parseInt(hash.substring(0, 8), 16);
    return hashInt % this.shardCount;
  }

  /**
   * Get shard key for Redis/MongoDB
   * @param {string} deviceId - Device identifier
   * @returns {string} Shard key (e.g., "shard:5")
   */
  getShardKey(deviceId) {
    const shardId = this.getShardId(deviceId);
    return `shard:${shardId}`;
  }

  /**
   * Get full memory key with shard prefix
   * @param {string} deviceId - Device identifier
   * @returns {string} Full key (e.g., "shard:5:mem:dev_xxx")
   */
  getMemoryKey(deviceId) {
    const shardKey = this.getShardKey(deviceId);
    return `${shardKey}:mem:${deviceId}`;
  }
}

module.exports = ShardingStrategy;
