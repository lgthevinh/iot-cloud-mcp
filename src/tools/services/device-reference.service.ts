import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { IotDevice } from '../../proxy/dto/iot-api-response.dto';
import { MCP_DEVICE_REF_PREFIX, REDIS_CLIENT } from '../../redis/redis.constants';

export interface DeviceReferenceAssignment {
  device: IotDevice;
  ref: string;
}

@Injectable()
export class DeviceReferenceService {
  private readonly logger = new Logger(DeviceReferenceService.name);
  private readonly ttlSeconds = 3600;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async assignAndStore(
    projectApiKey: string,
    userId: string,
    devices: IotDevice[],
  ): Promise<DeviceReferenceAssignment[]> {
    const assignments = this.assignRefs(devices);
    await this.storeMappings(projectApiKey, userId, assignments);
    return assignments;
  }

  async resolveDeviceUuid(
    projectApiKey: string,
    userId: string,
    deviceRef: string,
    loadDevices: () => Promise<IotDevice[]>,
  ): Promise<string> {
    const ref = this.normalizeRef(deviceRef);
    const cached = await this.getCachedUuid(projectApiKey, userId, ref);
    if (cached) {
      return cached;
    }

    const devices = await loadDevices();
    const assignments = await this.assignAndStore(projectApiKey, userId, devices);
    const match = assignments.find((assignment) => assignment.ref === ref);
    if (match) {
      return match.device.uuid;
    }

    throw new Error(
      `Unknown deviceRef "${deviceRef}". Call list_devices to get current device refs.`,
    );
  }

  private assignRefs(devices: IotDevice[]): DeviceReferenceAssignment[] {
    const sorted = [...devices].sort((a, b) => {
      const aBase = this.baseRef(a);
      const bBase = this.baseRef(b);
      if (aBase !== bBase) {
        return aBase.localeCompare(bBase);
      }
      return a.uuid.localeCompare(b.uuid);
    });

    const seen = new Map<string, number>();
    const refByUuid = new Map<string, string>();

    for (const device of sorted) {
      const base = this.baseRef(device);
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      refByUuid.set(device.uuid, count === 1 ? base : `${base}-${count}`);
    }

    return devices.map((device) => ({
      device,
      ref: refByUuid.get(device.uuid) ?? this.baseRef(device),
    }));
  }

  private async storeMappings(
    projectApiKey: string,
    userId: string,
    assignments: DeviceReferenceAssignment[],
  ): Promise<void> {
    try {
      await Promise.all(
        assignments.map((assignment) =>
          this.redis.set(
            this.key(projectApiKey, userId, assignment.ref),
            assignment.device.uuid,
            'EX',
            this.ttlSeconds,
          ),
        ),
      );
    } catch (error) {
      this.logger.warn(`Failed to store device refs: ${(error as Error).message}`);
    }
  }

  private async getCachedUuid(
    projectApiKey: string,
    userId: string,
    ref: string,
  ): Promise<string | null> {
    try {
      return await this.redis.get(this.key(projectApiKey, userId, ref));
    } catch (error) {
      this.logger.warn(`Failed to read device ref "${ref}": ${(error as Error).message}`);
      return null;
    }
  }

  private key(projectApiKey: string, userId: string, ref: string): string {
    return `${MCP_DEVICE_REF_PREFIX}${projectApiKey}:${userId}:${ref}`;
  }

  private baseRef(device: IotDevice): string {
    return this.normalizeRef(device.label || device.desc || 'device');
  }

  private normalizeRef(value: string): string {
    const normalized = value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 48)
      .replace(/-+$/g, '');

    return normalized || 'device';
  }
}
