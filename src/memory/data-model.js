/**
 * Data Model - Memory structure definitions
 * Defines schema for intimacy, learning, stories, constraints
 */

class DataModel {
  /**
   * Create empty memory structure
   * @param {string} deviceId - Device identifier
   * @returns {Object} Empty memory object
   */
  static createEmpty(deviceId) {
    return {
      device_id: deviceId,
      intimacy: {
        level: 1,
        points: 0,
        last_interaction: null
      },
      learning: {},
      stories: [],
      constraints: [],
      metadata: {
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        version: 1
      }
    };
  }

  /**
   * Validate intimacy data
   * @param {Object} intimacy - Intimacy object
   * @returns {boolean} Valid or not
   */
  static validateIntimacy(intimacy) {
    if (!intimacy || typeof intimacy !== 'object') return false;
    if (typeof intimacy.level !== 'number' || intimacy.level < 1 || intimacy.level > 10) return false;
    if (typeof intimacy.points !== 'number' || intimacy.points < 0) return false;
    return true;
  }

  /**
   * Validate learning data
   * @param {Object} learning - Learning object
   * @returns {boolean} Valid or not
   */
  static validateLearning(learning) {
    if (!learning || typeof learning !== 'object') return false;

    for (const [subject, data] of Object.entries(learning)) {
      if (!data || typeof data !== 'object') return false;
      if (typeof data.progress !== 'number' || data.progress < 0 || data.progress > 1) return false;
    }

    return true;
  }

  /**
   * Validate story data
   * @param {Array} stories - Stories array
   * @returns {boolean} Valid or not
   */
  static validateStories(stories) {
    if (!Array.isArray(stories)) return false;

    for (const story of stories) {
      if (!story || typeof story !== 'object') return false;
      if (!story.id || typeof story.id !== 'string') return false;
      if (!story.content || typeof story.content !== 'string') return false;
      if (!story.timestamp) return false;
    }

    return true;
  }

  /**
   * Validate constraint data
   * @param {Array} constraints - Constraints array
   * @returns {boolean} Valid or not
   */
  static validateConstraints(constraints) {
    if (!Array.isArray(constraints)) return false;

    for (const constraint of constraints) {
      if (!constraint || typeof constraint !== 'object') return false;
      if (!constraint.type || typeof constraint.type !== 'string') return false;
      if (!constraint.rule) return false;
    }

    return true;
  }

  /**
   * Validate entire memory object
   * @param {Object} memory - Memory object
   * @returns {Object} Validation result {valid: boolean, errors: string[]}
   */
  static validate(memory) {
    const errors = [];

    if (!memory || typeof memory !== 'object') {
      return { valid: false, errors: ['Memory must be an object'] };
    }

    if (!memory.device_id || typeof memory.device_id !== 'string') {
      errors.push('device_id is required and must be a string');
    }

    if (memory.intimacy && !this.validateIntimacy(memory.intimacy)) {
      errors.push('Invalid intimacy data');
    }

    if (memory.learning && !this.validateLearning(memory.learning)) {
      errors.push('Invalid learning data');
    }

    if (memory.stories && !this.validateStories(memory.stories)) {
      errors.push('Invalid stories data');
    }

    if (memory.constraints && !this.validateConstraints(memory.constraints)) {
      errors.push('Invalid constraints data');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Merge two memory objects (for conflict resolution)
   * @param {Object} base - Base memory
   * @param {Object} incoming - Incoming memory
   * @returns {Object} Merged memory
   */
  static merge(base, incoming) {
    const merged = { ...base };

    // Intimacy: use higher level/points
    if (incoming.intimacy) {
      merged.intimacy = {
        level: Math.max(base.intimacy?.level || 0, incoming.intimacy.level),
        points: Math.max(base.intimacy?.points || 0, incoming.intimacy.points),
        last_interaction: incoming.intimacy.last_interaction || base.intimacy?.last_interaction
      };
    }

    // Learning: merge progress
    if (incoming.learning) {
      merged.learning = { ...base.learning, ...incoming.learning };
    }

    // Stories: append new stories
    if (incoming.stories) {
      const existingIds = new Set((base.stories || []).map(s => s.id));
      const newStories = incoming.stories.filter(s => !existingIds.has(s.id));
      merged.stories = [...(base.stories || []), ...newStories];
    }

    // Constraints: replace with incoming
    if (incoming.constraints) {
      merged.constraints = incoming.constraints;
    }

    // Metadata: update timestamp
    merged.metadata = {
      ...base.metadata,
      last_updated: new Date().toISOString(),
      version: (base.metadata?.version || 0) + 1
    };

    return merged;
  }
}

module.exports = DataModel;
