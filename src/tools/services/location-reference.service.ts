import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { IotLocation } from '../../proxy/dto/iot-api-response.dto';
import { MCP_LOCATION_REF_PREFIX, REDIS_CLIENT } from '../../redis/redis.constants';

export interface LocationReferenceAssignment {
  location: IotLocation;
  ref: string;
}

@Injectable()
export class LocationReferenceService {
  private readonly logger = new Logger(LocationReferenceService.name);
  private readonly ttlSeconds = 3600;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async assignAndStore(
    projectApiKey: string,
    userId: string,
    locations: IotLocation[],
  ): Promise<LocationReferenceAssignment[]> {
    const assignments = this.assignRefs(locations);
    await this.storeMappings(projectApiKey, userId, assignments);
    return assignments;
  }

  async resolveLocationUuid(
    projectApiKey: string,
    userId: string,
    locationRef: string,
    loadLocations: () => Promise<IotLocation[]>,
  ): Promise<string> {
    const ref = this.normalizeRef(locationRef);
    const cached = await this.getCachedUuid(projectApiKey, userId, ref);
    if (cached) {
      return cached;
    }

    const locations = await loadLocations();
    const assignments = await this.assignAndStore(projectApiKey, userId, locations);
    const match = assignments.find((assignment) => assignment.ref === ref);
    if (match) {
      return match.location.uuid;
    }

    throw new Error(
      `Unknown locationRef "${locationRef}". Call list_locations to get current location refs.`,
    );
  }

  private assignRefs(locations: IotLocation[]): LocationReferenceAssignment[] {
    const sorted = [...locations].sort((a, b) => {
      const aBase = this.baseRef(a);
      const bBase = this.baseRef(b);
      if (aBase !== bBase) {
        return aBase.localeCompare(bBase);
      }
      return a.uuid.localeCompare(b.uuid);
    });

    const seen = new Map<string, number>();
    const refByUuid = new Map<string, string>();

    for (const location of sorted) {
      const base = this.baseRef(location);
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      refByUuid.set(location.uuid, count === 1 ? base : `${base}-${count}`);
    }

    return locations.map((location) => ({
      location,
      ref: refByUuid.get(location.uuid) ?? this.baseRef(location),
    }));
  }

  private async storeMappings(
    projectApiKey: string,
    userId: string,
    assignments: LocationReferenceAssignment[],
  ): Promise<void> {
    try {
      await Promise.all(
        assignments.map((assignment) =>
          this.redis.set(
            this.key(projectApiKey, userId, assignment.ref),
            assignment.location.uuid,
            'EX',
            this.ttlSeconds,
          ),
        ),
      );
    } catch (error) {
      this.logger.warn(`Failed to store location refs: ${(error as Error).message}`);
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
      this.logger.warn(`Failed to read location ref "${ref}": ${(error as Error).message}`);
      return null;
    }
  }

  private key(projectApiKey: string, userId: string, ref: string): string {
    return `${MCP_LOCATION_REF_PREFIX}${projectApiKey}:${userId}:${ref}`;
  }

  private baseRef(location: IotLocation): string {
    return this.normalizeRef(location.label || location.desc || 'location');
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

    return normalized || 'location';
  }
}
