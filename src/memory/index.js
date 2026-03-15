/**
 * Memory Manager - Multi-tier memory system
 * L1: Redis (hot), L2: MongoDB (warm), L3: OSS (cold)
 */

const RedisLayer = require('./redis-layer');
const MongoLayer = require('./mongo-layer');
const OSSLayer = require('./oss-layer');
const DataModel = require('./data-model');

class MemoryManager {
  constructor(config = {}) {
    this.l1 = new RedisLayer(config.redis);
    this.l2 = new MongoLayer(config.mongo);
    this.l3 = new OSSLayer(config.oss);
    this.enableL2 = !!config.mongo;
    this.enableL3 = !!config.oss;
  }

  /**
   * Initialize connections
   */
  async connect() {
    if (this.enableL2) {
      await this.l2.connect(config.dbName);
    }
  }

  /**
   * Get memory data with fallback chain: L1 -> L2 -> L3
   * @param {string} deviceId - Device identifier
   * @param {string} key - Optional field key
   * @returns {*} Memory data
   */
  async get(deviceId, key) {
    if (!deviceId) throw new Error('device_id required');

    try {
      // Try L1 (Redis)
      const l1Data = await this.l1.get(deviceId, key);
      if (l1Data !== null) return l1Data;

      // Try L2 (MongoDB)
      if (this.enableL2) {
        const l2Data = await this.l2.get(deviceId, key);
        if (l2Data !== null) {
          // Warm up L1 cache
          await this._warmupL1(deviceId, l2Data);
          return l2Data;
        }
      }

      // L3 (OSS) not used for real-time reads
      return null;
    } catch (err) {
      console.error(`Memory get error for ${deviceId}:`, err);
      throw err;
    }
  }

  /**
   * Get all memory data
   * @param {string} deviceId - Device identifier
   * @returns {Object} Complete memory object
   */
  async getAll(deviceId) {
    if (!deviceId) throw new Error('device_id required');
    return this.get(deviceId);
  }

  /**
   * Set memory data (write to L1, async persist to L2)
   * @param {string} deviceId - Device identifier
   * @param {string} key - Field key
   * @param {*} value - Field value
   * @returns {Object} Updated memory
   */
  async set(deviceId, key, value) {
    if (!deviceId) throw new Error('device_id required');
    if (!key) throw new Error('key required');

    try {
      // Write to L1 (sync)
      const updated = await this.l1.set(deviceId, key, value);

      // Persist to L2 (async, non-blocking)
      if (this.enableL2) {
        this._persistToL2(deviceId, key, value).catch(err => {
          console.error(`L2 persist error for ${deviceId}:`, err);
        });
      }

      return updated;
    } catch (err) {
      // Fallback to L2 if L1 fails
      if (this.enableL2) {
        console.warn(`L1 write failed, using L2 for ${deviceId}`);
        return this.l2.set(deviceId, key, value);
      }
      throw err;
    }
  }

  /**
   * Update memory data (merge or increment)
   * @param {string} deviceId - Device identifier
   * @param {string} key - Field key
   * @param {*} delta - Delta value
   * @returns {Object} Updated memory
   */
  async update(deviceId, key, delta) {
    if (!deviceId) throw new Error('device_id required');
    if (!key) throw new Error('key required');

    try {
      const updated = await this.l1.update(deviceId, key, delta);

      if (this.enableL2) {
        this._persistToL2(deviceId, key, updated[key]).catch(err => {
          console.error(`L2 persist error for ${deviceId}:`, err);
        });
      }

      return updated;
    } catch (err) {
      if (this.enableL2) {
        return this.l2.update(deviceId, key, delta);
      }
      throw err;
    }
  }

  /**
   * Delete memory data
   * @param {string} deviceId - Device identifier
   * @param {string} key - Optional field key
   */
  async delete(deviceId, key) {
    if (!deviceId) throw new Error('device_id required');

    await this.l1.delete(deviceId, key);

    if (this.enableL2) {
      await this.l2.delete(deviceId, key);
    }
  }

  /**
   * Sync memory from L1 to L2 (force persist)
   * @param {string} deviceId - Device identifier
   * @returns {Object} Synced memory
   */
  async sync(deviceId) {
    if (!deviceId) throw new Error('device_id required');

    const data = await this.getAll(deviceId);
    if (!data) return null;

    if (this.enableL2) {
      // Write entire object to L2
      for (const [key, value] of Object.entries(data)) {
        if (key !== 'device_id' && key !== 'metadata') {
          await this.l2.set(deviceId, key, value);
        }
      }
    }

    return data;
  }

  /**
   * Flush L1 cache
   * @param {string} deviceId - Device identifier
   */
  async flush(deviceId) {
    if (!deviceId) throw new Error('device_id required');
    await this.l1.delete(deviceId);
  }

  /**
   * Archive old data from L2 to L3
   * @param {number} daysOld - Days threshold (default: 7)
   * @returns {Array} Archived object keys
   */
  async archiveOldData(daysOld = 7) {
    if (!this.enableL2 || !this.enableL3) {
      throw new Error('L2 and L3 must be enabled for archiving');
    }

    const oldDocs = await this.l2.archiveOldData(daysOld);
    const results = [];

    for (const doc of oldDocs) {
      try {
        const key = await this.l3.archive(doc.device_id, doc);
        results.push({ deviceId: doc.device_id, key, success: true });

        // Delete from L2 after successful archive
        await this.l2.delete(doc.device_id);
      } catch (err) {
        results.push({ deviceId: doc.device_id, error: err.message, success: false });
      }
    }

    return results;
  }

  /**
   * Warm up L1 cache from L2 data
   * @private
   */
  async _warmupL1(deviceId, data) {
    try {
      if (typeof data === 'object' && !Array.isArray(data)) {
        for (const [key, value] of Object.entries(data)) {
          if (key !== 'device_id' && key !== 'metadata') {
            await this.l1.set(deviceId, key, value);
          }
        }
      }
    } catch (err) {
      console.error(`L1 warmup error for ${deviceId}:`, err);
    }
  }

  /**
   * Persist to L2 (async, non-blocking)
   * @private
   */
  async _persistToL2(deviceId, key, value) {
    await this.l2.set(deviceId, key, value);
  }
}

module.exports = MemoryManager;
