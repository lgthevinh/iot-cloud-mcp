import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { IotGroup } from '../../proxy/dto/iot-api-response.dto';
import { MCP_GROUP_REF_PREFIX, REDIS_CLIENT } from '../../redis/redis.constants';

export interface GroupReferenceAssignment {
  group: IotGroup;
  ref: string;
}

@Injectable()
export class GroupReferenceService {
  private readonly logger = new Logger(GroupReferenceService.name);
  private readonly ttlSeconds = 3600;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async assignAndStore(
    projectApiKey: string,
    userId: string,
    groups: IotGroup[],
  ): Promise<GroupReferenceAssignment[]> {
    const assignments = this.assignRefs(groups);
    await this.storeMappings(projectApiKey, userId, assignments);
    return assignments;
  }

  async resolveGroupUuid(
    projectApiKey: string,
    userId: string,
    groupRef: string,
    loadGroups: () => Promise<IotGroup[]>,
  ): Promise<string> {
    const ref = this.normalizeRef(groupRef);
    const cached = await this.getCachedUuid(projectApiKey, userId, ref);
    if (cached) {
      return cached;
    }

    const groups = await loadGroups();
    const assignments = await this.assignAndStore(projectApiKey, userId, groups);
    const match = assignments.find((assignment) => assignment.ref === ref);
    if (match) {
      return match.group.uuid;
    }

    throw new Error(`Unknown groupRef "${groupRef}". Call list_groups to get current group refs.`);
  }

  private assignRefs(groups: IotGroup[]): GroupReferenceAssignment[] {
    const sorted = [...groups].sort((a, b) => {
      const aBase = this.baseRef(a);
      const bBase = this.baseRef(b);
      if (aBase !== bBase) {
        return aBase.localeCompare(bBase);
      }
      return a.uuid.localeCompare(b.uuid);
    });

    const seen = new Map<string, number>();
    const refByUuid = new Map<string, string>();

    for (const group of sorted) {
      const base = this.baseRef(group);
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      refByUuid.set(group.uuid, count === 1 ? base : `${base}-${count}`);
    }

    return groups.map((group) => ({
      group,
      ref: refByUuid.get(group.uuid) ?? this.baseRef(group),
    }));
  }

  private async storeMappings(
    projectApiKey: string,
    userId: string,
    assignments: GroupReferenceAssignment[],
  ): Promise<void> {
    try {
      await Promise.all(
        assignments.map((assignment) =>
          this.redis.set(
            this.key(projectApiKey, userId, assignment.ref),
            assignment.group.uuid,
            'EX',
            this.ttlSeconds,
          ),
        ),
      );
    } catch (error) {
      this.logger.warn(`Failed to store group refs: ${(error as Error).message}`);
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
      this.logger.warn(`Failed to read group ref "${ref}": ${(error as Error).message}`);
      return null;
    }
  }

  private key(projectApiKey: string, userId: string, ref: string): string {
    return `${MCP_GROUP_REF_PREFIX}${projectApiKey}:${userId}:${ref}`;
  }

  private baseRef(group: IotGroup): string {
    return this.normalizeRef(group.label || group.desc || 'group');
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

    return normalized || 'group';
  }
}
