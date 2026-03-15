/**
 * Redis Layer (L1) - Hot data cache
 * Falls back to in-memory Map if Redis unavailable
 */

const ShardingStrategy = require('./sharding');
const DataModel = require('./data-model');

class RedisLayer {
  constructor(redisClient = null) {
    this.redis = redisClient;
    this.fallback = new Map(); // In-memory fallback
    this.ttl = 3600; // 1 hour
    this.sharding = new ShardingStrategy();
  }

  async get(deviceId, key) {
    const fullKey = this.sharding.getMemoryKey(deviceId);

    if (this.redis) {
      const data = await this.redis.get(fullKey);
      if (!data) return null;
      const parsed = JSON.parse(data);
      return key ? parsed[key] : parsed;
    }

    const data = this.fallback.get(fullKey);
    return data ? (key ? data[key] : data) : null;
  }

  async set(deviceId, key, value) {
    const fullKey = this.sharding.getMemoryKey(deviceId);
    const existing = await this.get(deviceId) || DataModel.createEmpty(deviceId);
    const updated = {
      ...existing,
      [key]: value,
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

    if (this.redis) {
      await this.redis.setex(fullKey, this.ttl, JSON.stringify(updated));
    } else {
      this.fallback.set(fullKey, updated);
    }

    return updated;
  }

  async update(deviceId, key, delta) {
    const current = await this.get(deviceId, key);

    if (typeof current === 'number' && typeof delta === 'number') {
      return this.set(deviceId, key, current + delta);
    }

    if (typeof current === 'object' && typeof delta === 'object') {
      return this.set(deviceId, key, { ...current, ...delta });
    }

    return this.set(deviceId, key, delta);
  }

  async delete(deviceId, key) {
    const fullKey = this.sharding.getMemoryKey(deviceId);

    if (key) {
      const data = await this.get(deviceId) || {};
      delete data[key];
      data.metadata = {
        ...data.metadata,
        last_updated: new Date().toISOString()
      };

      if (this.redis) {
        await this.redis.setex(fullKey, this.ttl, JSON.stringify(data));
      } else {
        this.fallback.set(fullKey, data);
      }
    } else {
      if (this.redis) {
        await this.redis.del(fullKey);
      } else {
        this.fallback.delete(fullKey);
      }
    }
  }

  async flush(deviceId) {
    await this.delete(deviceId);
  }
}

module.exports = RedisLayer;
