import { JWTService } from '../../src/services/jwt.service';
import { JWTPayload } from '../../src/models/types';

describe('JWTService', () => {
  let jwtService: JWTService;

  beforeEach(() => {
    jwtService = new JWTService();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload: JWTPayload = {
        deviceId: 'test-device-123',
        deviceType: 'android',
      };

      const token = jwtService.generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for different payloads', () => {
      const payload1: JWTPayload = {
        deviceId: 'device-1',
        deviceType: 'android',
      };
      const payload2: JWTPayload = {
        deviceId: 'device-2',
        deviceType: 'ios',
      };

      const token1 = jwtService.generateToken(payload1);
      const token2 = jwtService.generateToken(payload2);

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload: JWTPayload = {
        deviceId: 'test-device-123',
        deviceType: 'android',
      };

      const token = jwtService.generateToken(payload);
      const decoded = jwtService.verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.deviceId).toBe(payload.deviceId);
      expect(decoded.deviceType).toBe(payload.deviceType);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => jwtService.verifyToken(invalidToken)).toThrow();
    });

    it('should throw error for malformed token', () => {
      const malformedToken = 'not-a-jwt-token';

      expect(() => jwtService.verifyToken(malformedToken)).toThrow();
    });

    it('should throw error for empty token', () => {
      expect(() => jwtService.verifyToken('')).toThrow();
    });
  });

  describe('token lifecycle', () => {
    it('should generate and verify token successfully', () => {
      const payload: JWTPayload = {
        deviceId: 'lifecycle-test',
        deviceType: 'embedded',
      };

      const token = jwtService.generateToken(payload);
      const decoded = jwtService.verifyToken(token);

      expect(decoded.deviceId).toBe(payload.deviceId);
      expect(decoded.deviceType).toBe(payload.deviceType);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });
  });
});
