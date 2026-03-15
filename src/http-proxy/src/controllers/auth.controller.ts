import { Request, Response } from 'express';
import { JWTService } from '../services/jwt.service';
import { DeviceService } from '../services/device.service';
import { RegisterDeviceRequest, RegisterDeviceResponse } from '../models/types';

export class AuthController {
  constructor(
    private jwtService: JWTService,
    private deviceService: DeviceService
  ) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const deviceData: RegisterDeviceRequest = req.body;

    const device = await this.deviceService.registerDevice(deviceData);

    const token = this.jwtService.generateToken({
      deviceId: device.deviceId,
      deviceType: device.deviceType,
    });

    const response: RegisterDeviceResponse = {
      success: true,
      data: {
        deviceId: device.deviceId,
        token,
      },
    };

    res.status(200).json(response);
  };

  verify = async (req: Request, res: Response): Promise<void> => {
    // Device is already attached by auth middleware
    res.status(200).json({
      success: true,
      data: {
        deviceId: req.device!.deviceId,
        deviceName: req.device!.deviceName,
        deviceType: req.device!.deviceType,
      },
    });
  };
}
