import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../models/types';

export const validateRegisterDevice = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { deviceName, deviceType, osVersion, appVersion } = req.body;

  if (!deviceName || typeof deviceName !== 'string') {
    throw new ValidationError('deviceName is required and must be a string');
  }

  if (!deviceType || !['android', 'ios', 'embedded'].includes(deviceType)) {
    throw new ValidationError(
      'deviceType must be one of: android, ios, embedded'
    );
  }

  if (!osVersion || typeof osVersion !== 'string') {
    throw new ValidationError('osVersion is required and must be a string');
  }

  if (!appVersion || typeof appVersion !== 'string') {
    throw new ValidationError('appVersion is required and must be a string');
  }

  next();
};
