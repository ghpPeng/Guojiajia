import { Request, Response, NextFunction } from 'express';

export const validateRegisterDevice = (req: Request, res: Response, next: NextFunction): void => {
  const { deviceName, deviceType, osVersion, appVersion } = req.body;

  if (!deviceName || typeof deviceName !== 'string' || deviceName.length > 100) {
    res.status(400).json({ success: false, error: 'Invalid deviceName' });
    return;
  }

  if (!deviceType || typeof deviceType !== 'string' || !['ios', 'android', 'web'].includes(deviceType)) {
    res.status(400).json({ success: false, error: 'Invalid deviceType' });
    return;
  }

  if (!osVersion || typeof osVersion !== 'string' || osVersion.length > 50) {
    res.status(400).json({ success: false, error: 'Invalid osVersion' });
    return;
  }

  if (!appVersion || typeof appVersion !== 'string' || appVersion.length > 50) {
    res.status(400).json({ success: false, error: 'Invalid appVersion' });
    return;
  }

  next();
};
