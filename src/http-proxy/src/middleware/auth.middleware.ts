import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/jwt.service';
import { DeviceService } from '../services/device.service';
import { Device } from '../models/types';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      device?: Device;
    }
  }
}

export const authMiddleware = (
  jwtService: JWTService,
  deviceService: DeviceService
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No token provided',
        });
        return;
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        res.status(401).json({
          success: false,
          error: 'Invalid token format',
        });
        return;
      }

      const token = parts[1];
      const decoded = jwtService.verifyToken(token);

      const device = deviceService.getDevice(decoded.deviceId);
      if (!device) {
        res.status(401).json({
          success: false,
          error: 'Device not found',
        });
        return;
      }

      // Update last active timestamp
      deviceService.updateLastActive(device.deviceId);

      // Attach device to request
      req.device = device;

      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
  };
};
