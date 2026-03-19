import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../src/middleware/auth.middleware';
import { JWTService } from '../../src/services/jwt.service';
import { DeviceService } from '../../src/services/device.service';

describe('authMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jwtService: JWTService;
  let deviceService: DeviceService;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
    jwtService = new JWTService();
    deviceService = new DeviceService();
  });

  it('should pass with valid token', async () => {
    const device = await deviceService.registerDevice({
      deviceName: 'Test Device',
      deviceType: 'android',
      osVersion: '13.0',
      appVersion: '1.0.0',
    });

    const token = jwtService.generateToken({
      deviceId: device.deviceId,
      deviceType: device.deviceType,
    });

    mockRequest.headers = {
      authorization: `Bearer ${token}`,
    };

    const middleware = authMiddleware(jwtService, deviceService);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.device).toBeDefined();
    expect(mockRequest.device?.deviceId).toBe(device.deviceId);
  });

  it('should reject request without authorization header', () => {
    const middleware = authMiddleware(jwtService, deviceService);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: 'No token provided',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should reject request with invalid token format', () => {
    mockRequest.headers = {
      authorization: 'InvalidFormat',
    };

    const middleware = authMiddleware(jwtService, deviceService);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid token format',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should reject request with invalid token', () => {
    mockRequest.headers = {
      authorization: 'Bearer invalid.token.here',
    };

    const middleware = authMiddleware(jwtService, deviceService);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should reject request for non-existent device', () => {
    const token = jwtService.generateToken({
      deviceId: 'non-existent-device',
      deviceType: 'android',
    });

    mockRequest.headers = {
      authorization: `Bearer ${token}`,
    };

    const middleware = authMiddleware(jwtService, deviceService);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: 'Device not found',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
