import { IPermissionProvider, PermissionId, PermissionStatus } from './types';
import { PERMISSION_DEFINITIONS } from './permissionRegistry';

export class MockPermissionProvider implements IPermissionProvider {
  private statuses: Map<PermissionId, PermissionStatus> = new Map();

  constructor(initialGrants?: Partial<Record<PermissionId, PermissionStatus>>) {
    // Default: system:query and alias:read are granted by default; others are NOT_REQUESTED
    Object.keys(PERMISSION_DEFINITIONS).forEach((key) => {
      const perm = key as PermissionId;
      if (perm === 'sanad:perm:system:query' || perm === 'sanad:perm:alias:read') {
        this.statuses.set(perm, 'GRANTED');
      } else {
        this.statuses.set(perm, 'NOT_REQUESTED');
      }
    });

    if (initialGrants) {
      Object.entries(initialGrants).forEach(([perm, status]) => {
        if (status) this.statuses.set(perm as PermissionId, status);
      });
    }
  }

  public async checkPermission(permissionId: PermissionId): Promise<PermissionStatus> {
    return this.statuses.get(permissionId) || 'NOT_REQUESTED';
  }

  public async requestPermission(permissionId: PermissionId): Promise<PermissionStatus> {
    const current = this.statuses.get(permissionId);
    if (current === 'BLOCKED') {
      return 'BLOCKED';
    }
    this.statuses.set(permissionId, 'GRANTED');
    return 'GRANTED';
  }

  public setStatus(permissionId: PermissionId, status: PermissionStatus): void {
    this.statuses.set(permissionId, status);
  }

  public async checkAllPermissions(): Promise<Record<PermissionId, PermissionStatus>> {
    const result: Partial<Record<PermissionId, PermissionStatus>> = {};
    for (const [perm, status] of this.statuses.entries()) {
      result[perm] = status;
    }
    return result as Record<PermissionId, PermissionStatus>;
  }
}
