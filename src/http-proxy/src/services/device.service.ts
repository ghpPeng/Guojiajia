import { v4 as uuidv4 } from 'uuid';
import { Device, RegisterDeviceRequest } from '../models/types';
import { DeviceStorageService } from './device-storage.service';

export class DeviceService {
  private devices: Map<string, Device>;
  private storage: DeviceStorageService;

  private ready: Promise<void>;

  constructor(storageDir?: string) {
    this.devices = new Map();
    this.storage = new DeviceStorageService(storageDir);
    this.ready = this.storage.loadDevices().then(devices => {
      // Merge loaded devices, keeping any already registered in-memory
      devices.forEach((device, id) => {
        if (!this.devices.has(id)) {
          this.devices.set(id, device);
        }
      });
    }).catch(() => {});
  }

  async waitReady(): Promise<void> {
    return this.ready;
  }

  private async persist(): Promise<void> {
    await this.storage.saveDevices(this.devices);
  }

  async registerDevice(data: RegisterDeviceRequest): Promise<Device> {
    const device: Device = {
      deviceId: uuidv4(),
      deviceName: data.deviceName,
      deviceType: data.deviceType,
      osVersion: data.osVersion,
      appVersion: data.appVersion,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };

    this.devices.set(device.deviceId, device);
    await this.persist();
    return device;
  }

  getDevice(deviceId: string): Device | null {
    return this.devices.get(deviceId) || null;
  }

  async updateLastActive(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device) {
      device.lastActiveAt = new Date();
      await this.persist();
    }
  }

  getAllDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  async deleteDevice(deviceId: string): Promise<boolean> {
    const result = this.devices.delete(deviceId);
    if (result) {
      await this.persist();
    }
    return result;
  }
}
