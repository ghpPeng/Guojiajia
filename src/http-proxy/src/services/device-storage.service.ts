import { promises as fs } from 'fs';
import { join } from 'path';
import { Device } from '../models/types';
import { logger } from '../utils/logger';

export class DeviceStorageService {
  private storageFile: string;

  constructor(storageDir: string = './data') {
    this.storageFile = join(storageDir, 'devices.json');
    this.ensureStorageDir(storageDir);
  }

  private async ensureStorageDir(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create storage directory', error);
    }
  }

  async saveDevices(devices: Map<string, Device>): Promise<void> {
    try {
      const data = JSON.stringify(Array.from(devices.entries()), null, 2);
      await fs.writeFile(this.storageFile, data, 'utf-8');
    } catch (error) {
      logger.error('Failed to save devices', error);
    }
  }

  async loadDevices(): Promise<Map<string, Device>> {
    try {
      const data = await fs.readFile(this.storageFile, 'utf-8');
      const entries = JSON.parse(data);
      return new Map(entries.map(([k, v]: [string, any]) => [k, {
        ...v,
        createdAt: new Date(v.createdAt),
        lastActiveAt: new Date(v.lastActiveAt)
      }]));
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return new Map();
      }
      logger.error('Failed to load devices', error);
      return new Map();
    }
  }
}
