/**
 * MongoDB Layer (L2) - Warm data persistence
 * Retention: < 7 days, Target latency: <50ms
 */

const ShardingStrategy = require('./sharding');
const DataModel = require('./data-model');

class MongoLayer {
  constructor(mongoClient = null) {
    this.mongo = mongoClient;
    this.db = null;
    this.collection = 'memories';
    this.sharding = new ShardingStrategy();
    this.fallback = new Map(); // In-memory fallback
  }

  /**
   * Initialize MongoDB connection
   */
  async connect(dbName = 'guojiajia') {
    if (this.mongo) {
      this.db = this.mongo.db(dbName);
      await this._ensureIndexes();
    }
  }

  /**
   * Ensure indexes for performance
   */
  async _ensureIndexes() {
    if (!this.db) return;

    const coll = this.db.collection(this.collection);
    await coll.createIndex({ device_id: 1 }, { unique: true });
    await coll.createIndex({ 'metadata.last_updated': 1 });
    await coll.createIndex({ shard_id: 1 });
  }

  /**
   * Get memory data
   * @param {string} deviceId - Device identifier
   * @param {string} key - Optional field key
   * @returns {Object|null} Memory data
   */
  async get(deviceId, key) {
    if (!deviceId) throw new Error('device_id required');

    if (this.db) {
      const coll = this.db.collection(this.collection);
      const doc = await coll.findOne({ device_id: deviceId });

      if (!doc) return null;

      return key ? doc[key] : doc;
    }

    // Fallback to in-memory
    const data = this.fallback.get(deviceId);
    return data ? (key ? data[key] : data) : null;
  }

  /**
   * Set memory data
   * @param {string} deviceId - Device identifier
   * @param {string} key - Field key
   * @param {*} value - Field value
   * @returns {Object} Updated memory
   */
  async set(deviceId, key, value) {
    if (!deviceId) throw new Error('device_id required');
    if (!key) throw new Error('key required');

    const existing = await this.get(deviceId) || DataModel.createEmpty(deviceId);
    const updated = {
      ...existing,
      [key]: value,
      shard_id: this.sharding.getShardId(deviceId),
      metadata: {
        ...existing.metadata,
        last_updated: new Date().toISOString()
      }
    };

    // Validate before saving
    const validation = DataModel.validate(updated);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    if (this.db) {
      const coll = this.db.collection(this.collection);
      await coll.updateOne(
        { device_id: deviceId },
        { $set: updated },
        { upsert: true }
      );
    } else {
      this.fallback.set(deviceId, updated);
    }

    return updated;
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

    const current = await this.get(deviceId, key);

    // Numeric increment
    if (typeof current === 'number' && typeof delta === 'number') {
      return this.set(deviceId, key, current + delta);
    }

    // Object merge
    if (typeof current === 'object' && typeof delta === 'object') {
      return this.set(deviceId, key, { ...current, ...delta });
    }

    // Replace
    return this.set(deviceId, key, delta);
  }

  /**
   * Delete memory data
   * @param {string} deviceId - Device identifier
   * @param {string} key - Optional field key
   */
  async delete(deviceId, key) {
    if (!deviceId) throw new Error('device_id required');

    if (key) {
      // Delete specific field
      if (this.db) {
        const coll = this.db.collection(this.collection);
        await coll.updateOne(
          { device_id: deviceId },
          { $unset: { [key]: '' } }
        );
      } else {
        const data = this.fallback.get(deviceId);
        if (data) {
          delete data[key];
          this.fallback.set(deviceId, data);
        }
      }
    } else {
      // Delete entire document
      if (this.db) {
        const coll = this.db.collection(this.collection);
        await coll.deleteOne({ device_id: deviceId });
      } else {
        this.fallback.delete(deviceId);
      }
    }
  }

  /**
   * Query memories by shard
   * @param {number} shardId - Shard ID
   * @returns {Array} Memory documents
   */
  async queryByShard(shardId) {
    if (this.db) {
      const coll = this.db.collection(this.collection);
      return coll.find({ shard_id: shardId }).toArray();
    }

    // Fallback: filter in-memory
    const results = [];
    for (const [deviceId, data] of this.fallback.entries()) {
      if (this.sharding.getShardId(deviceId) === shardId) {
        results.push(data);
      }
    }
    return results;
  }

  /**
   * Archive old data (for L3 migration)
   * @param {number} daysOld - Days threshold
   * @returns {Array} Archived documents
   */
  async archiveOldData(daysOld = 7) {
    if (!this.db) return [];

    const threshold = new Date();
    threshold.setDate(threshold.getDate() - daysOld);

    const coll = this.db.collection(this.collection);
    const oldDocs = await coll.find({
      'metadata.last_updated': { $lt: threshold.toISOString() }
    }).toArray();

    return oldDocs;
  }
}

module.exports = MongoLayer;
