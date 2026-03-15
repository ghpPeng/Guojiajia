/**
 * OSS Layer (L3) - Cold data archive
 * Retention: > 7 days, Target latency: <500ms
 */

const ShardingStrategy = require('./sharding');

class OSSLayer {
  constructor(ossClient = null) {
    this.oss = ossClient;
    this.bucket = 'guojiajia-archive';
    this.sharding = new ShardingStrategy();
    this.fallback = new Map(); // In-memory fallback
  }

  /**
   * Get object key for OSS
   * @param {string} deviceId - Device identifier
   * @param {string} timestamp - ISO timestamp
   * @returns {string} OSS object key
   */
  _getObjectKey(deviceId, timestamp = null) {
    const shardId = this.sharding.getShardId(deviceId);
    const date = timestamp ? new Date(timestamp) : new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `shard-${shardId}/${year}/${month}/${day}/${deviceId}.json`;
  }

  /**
   * Archive memory data to OSS
   * @param {string} deviceId - Device identifier
   * @param {Object} data - Memory data
   * @returns {string} OSS object key
   */
  async archive(deviceId, data) {
    if (!deviceId) throw new Error('device_id required');
    if (!data) throw new Error('data required');

    const objectKey = this._getObjectKey(deviceId, data.metadata?.last_updated);
    const content = JSON.stringify(data, null, 2);

    if (this.oss) {
      await this.oss.put(objectKey, Buffer.from(content));
    } else {
      // Fallback to in-memory
      this.fallback.set(objectKey, data);
    }

    return objectKey;
  }

  /**
   * Retrieve archived data from OSS
   * @param {string} deviceId - Device identifier
   * @param {string} timestamp - ISO timestamp
   * @returns {Object|null} Archived data
   */
  async retrieve(deviceId, timestamp) {
    if (!deviceId) throw new Error('device_id required');

    const objectKey = this._getObjectKey(deviceId, timestamp);

    if (this.oss) {
      try {
        const result = await this.oss.get(objectKey);
        return JSON.parse(result.content.toString());
      } catch (err) {
        if (err.code === 'NoSuchKey') return null;
        throw err;
      }
    }

    // Fallback to in-memory
    return this.fallback.get(objectKey) || null;
  }

  /**
   * List archived objects for a device
   * @param {string} deviceId - Device identifier
   * @param {Object} options - Query options {startDate, endDate, limit}
   * @returns {Array} List of object keys
   */
  async list(deviceId, options = {}) {
    if (!deviceId) throw new Error('device_id required');

    const shardId = this.sharding.getShardId(deviceId);
    const prefix = `shard-${shardId}/`;

    if (this.oss) {
      const result = await this.oss.list({
        prefix,
        'max-keys': options.limit || 100
      });

      return result.objects
        .filter(obj => obj.name.includes(deviceId))
        .map(obj => obj.name);
    }

    // Fallback to in-memory
    const keys = [];
    for (const key of this.fallback.keys()) {
      if (key.startsWith(prefix) && key.includes(deviceId)) {
        keys.push(key);
      }
    }
    return keys.slice(0, options.limit || 100);
  }

  /**
   * Delete archived data
   * @param {string} objectKey - OSS object key
   */
  async delete(objectKey) {
    if (!objectKey) throw new Error('object_key required');

    if (this.oss) {
      await this.oss.delete(objectKey);
    } else {
      this.fallback.delete(objectKey);
    }
  }

  /**
   * Batch archive multiple memories
   * @param {Array} memories - Array of {deviceId, data}
   * @returns {Array} Array of object keys
   */
  async batchArchive(memories) {
    if (!Array.isArray(memories)) throw new Error('memories must be an array');

    const results = [];
    for (const { deviceId, data } of memories) {
      try {
        const key = await this.archive(deviceId, data);
        results.push({ deviceId, key, success: true });
      } catch (err) {
        results.push({ deviceId, error: err.message, success: false });
      }
    }

    return results;
  }

  /**
   * Get storage statistics
   * @param {number} shardId - Optional shard ID
   * @returns {Object} Storage stats
   */
  async getStats(shardId = null) {
    if (this.oss) {
      const prefix = shardId !== null ? `shard-${shardId}/` : '';
      const result = await this.oss.list({ prefix, 'max-keys': 1000 });

      return {
        total_objects: result.objects.length,
        total_size: result.objects.reduce((sum, obj) => sum + obj.size, 0),
        shard_id: shardId
      };
    }

    // Fallback stats
    const keys = shardId !== null
      ? Array.from(this.fallback.keys()).filter(k => k.startsWith(`shard-${shardId}/`))
      : Array.from(this.fallback.keys());

    return {
      total_objects: keys.length,
      total_size: keys.reduce((sum, key) => {
        const data = this.fallback.get(key);
        return sum + JSON.stringify(data).length;
      }, 0),
      shard_id: shardId
    };
  }
}

module.exports = OSSLayer;
