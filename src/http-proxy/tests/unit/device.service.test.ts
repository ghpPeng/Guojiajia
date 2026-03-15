import { DeviceService } from '../../src/services/device.service';

describe('DeviceService', () => {
  let deviceService: DeviceService;

  beforeEach(() => {
    deviceService = new DeviceService();
  });

  describe('registerDevice', () => {
    it('should register a new device', () => {
      const deviceData = {
        deviceName: 'Test Phone',
        deviceType: 'android' as const,
        osVersion: '13.0',
        appVersion: '1.0.0',
      };

      const device = deviceService.registerDevice(deviceData);

      expect(device).toBeDefined();
      expect(device.deviceId).toBeDefined();
      expect(device.deviceName).toBe(deviceData.deviceName);
      expect(device.deviceType).toBe(deviceData.deviceType);
      expect(device.osVersion).toBe(deviceData.osVersion);
      expect(device.appVersion).toBe(deviceData.appVersion);
      expect(device.createdAt).toBeInstanceOf(Date);
      expect(device.lastActiveAt).toBeInstanceOf(Date);
    });

    it('should generate unique device IDs', () => {
      const deviceData = {
        deviceName: 'Test Phone',
        deviceType: 'android' as const,
        osVersion: '13.0',
        appVersion: '1.0.0',
      };

      const device1 = deviceService.registerDevice(deviceData);
      const device2 = deviceService.registerDevice(deviceData);

      expect(device1.deviceId).not.toBe(device2.deviceId);
    });
  });

  describe('getDevice', () => {
    it('should retrieve an existing device', () => {
      const deviceData = {
        deviceName: 'Test Phone',
        deviceType: 'android' as const,
        osVersion: '13.0',
        appVersion: '1.0.0',
      };

      const registered = deviceService.registerDevice(deviceData);
      const retrieved = deviceService.getDevice(registered.deviceId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.deviceId).toBe(registered.deviceId);
      expect(retrieved?.deviceName).toBe(deviceData.deviceName);
    });

    it('should return null for non-existent device', () => {
      const device = deviceService.getDevice('non-existent-id');

      expect(device).toBeNull();
    });
  });

  describe('updateLastActive', () => {
    it('should update device last active timestamp', (done) => {
      const deviceData = {
        deviceName: 'Test Phone',
        deviceType: 'android' as const,
        osVersion: '13.0',
        appVersion: '1.0.0',
      };

      const device = deviceService.registerDevice(deviceData);
      const originalLastActive = device.lastActiveAt;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        deviceService.updateLastActive(device.deviceId);
        const updated = deviceService.getDevice(device.deviceId);

        expect(updated).toBeDefined();
        expect(updated).not.toBeNull();
        if (updated) {
          expect(updated.lastActiveAt.getTime()).toBeGreaterThan(
            originalLastActive.getTime()
          );
        }
        done();
      }, 10);
    });

    it('should not throw error for non-existent device', () => {
      expect(() => {
        deviceService.updateLastActive('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('getAllDevices', () => {
    it('should return all registered devices', () => {
      const device1 = deviceService.registerDevice({
        deviceName: 'Phone 1',
        deviceType: 'android',
        osVersion: '13.0',
        appVersion: '1.0.0',
      });

      const device2 = deviceService.registerDevice({
        deviceName: 'Phone 2',
        deviceType: 'ios',
        osVersion: '16.0',
        appVersion: '1.0.0',
      });

      const devices = deviceService.getAllDevices();

      expect(devices).toHaveLength(2);
      expect(devices.map(d => d.deviceId)).toContain(device1.deviceId);
      expect(devices.map(d => d.deviceId)).toContain(device2.deviceId);
    });

    it('should return empty array when no devices registered', () => {
      const devices = deviceService.getAllDevices();

      expect(devices).toEqual([]);
    });
  });
});
