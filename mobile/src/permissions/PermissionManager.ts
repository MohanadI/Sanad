import { CapabilityId, IPermissionProvider, PermissionId, PermissionStatus, TierEvaluationResult } from './types';
import { evaluatePermissionTiers, EvaluationContext } from './tierEvaluation';
import { MockPermissionProvider } from './mockPermissionProvider';
import { buildPermissionRationaleArabic } from './rationaleBuilder';
import { accessibilityManager } from '../accessibility/AccessibilityManager';

export class PermissionManager {
  private provider: IPermissionProvider;
  private userGrants: Set<string> = new Set([
    'sanad:perm:system:query',
    'sanad:perm:alias:read',
    'sanad:perm:alias:write',
    'sanad:perm:audit:read',
  ]);
  private osPermissions: Record<string, boolean> = {
    'android.permission.RECORD_AUDIO': true,
    'android.permission.READ_CONTACTS': false,
    'android.permission.CALL_PHONE': false,
    'android.permission.SEND_SMS': false,
    'android.permission.ACCESS_FINE_LOCATION': false,
    'android.permission.READ_CALENDAR': false,
    'android.permission.WRITE_CALENDAR': false,
  };

  // Static Capability Feature Gates (Tier 1) - from CAPABILITY_MATRIX.md Section 4
  private featureGates: Record<CapabilityId, boolean> = {
    CAP_ASSISTANT_QUERY: true,
    CAP_ALIAS_MANAGE: true,
    CAP_SETTINGS_ACCESSIBILITY: true,
    CAP_AUDIT_INSPECT: true,
    CAP_ACTION_CANCEL: true,
    // Sensitive / Deferred Capabilities (Strictly Disabled)
    CAP_CONTACT_CALL: false,
    CAP_MESSAGE_SEND: false,
    CAP_LOCATION_READ: false,
    CAP_LOCATION_SHARE: false,
    CAP_CALENDAR_READ: false,
    CAP_CALENDAR_WRITE: false,
    CAP_EMERGENCY_TRIGGER: false,
  };

  constructor(provider?: IPermissionProvider) {
    this.provider = provider || new MockPermissionProvider();
  }

  public setProvider(provider: IPermissionProvider): void {
    this.provider = provider;
  }

  public async getPermissionStatus(permissionId: PermissionId): Promise<PermissionStatus> {
    return this.provider.checkPermission(permissionId);
  }

  public async requestUserConsent(permissionId: PermissionId): Promise<boolean> {
    const rationale = buildPermissionRationaleArabic(permissionId);
    accessibilityManager.announce(rationale.spokenPrompt, true);

    const status = await this.provider.requestPermission(permissionId);
    if (status === 'GRANTED') {
      this.userGrants.add(permissionId);
      return true;
    }
    this.userGrants.delete(permissionId);
    return false;
  }

  public revokeUserConsent(permissionId: PermissionId): void {
    this.userGrants.delete(permissionId);
  }

  public hasUserConsent(permissionId: PermissionId): boolean {
    return this.userGrants.has(permissionId);
  }

  public getUserGrants(): Set<string> {
    return new Set(this.userGrants);
  }

  public setUserGrants(grants: string[]): void {
    this.userGrants = new Set(grants);
  }

  public setOsPermission(permission: string, granted: boolean): void {
    this.osPermissions[permission] = granted;
  }

  public setFeatureGate(capability: CapabilityId, enabled: boolean): void {
    this.featureGates[capability] = enabled;
  }

  public isFeatureEnabled(capability: CapabilityId): boolean {
    return !!this.featureGates[capability];
  }

  /**
   * Deterministic 4-tier evaluation for an incoming action capability.
   */
  public evaluateCapability(
    capabilityId: CapabilityId,
    isConditionalOverwrite: boolean = false
  ): TierEvaluationResult {
    const context: EvaluationContext = {
      capabilityId,
      userGrants: this.userGrants,
      osPermissions: this.osPermissions,
      featureGates: this.featureGates,
      isConditionalOverwrite,
    };

    return evaluatePermissionTiers(context);
  }

  public async getAllStatuses(): Promise<Record<PermissionId, PermissionStatus>> {
    return this.provider.checkAllPermissions();
  }
}

export const permissionManager = new PermissionManager();
