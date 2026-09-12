export type PermissionId =
  | 'sanad:perm:system:query'
  | 'sanad:perm:alias:read'
  | 'sanad:perm:alias:write'
  | 'sanad:perm:audit:read'
  | 'sanad:perm:contacts:read'
  | 'sanad:perm:telephony:call'
  | 'sanad:perm:sms:send'
  | 'sanad:perm:location:read'
  | 'sanad:perm:location:share'
  | 'sanad:perm:calendar:read'
  | 'sanad:perm:calendar:write'
  | 'sanad:perm:emergency:alert';

export type CapabilityId =
  | 'CAP_ASSISTANT_QUERY'
  | 'CAP_ALIAS_MANAGE'
  | 'CAP_SETTINGS_ACCESSIBILITY'
  | 'CAP_AUDIT_INSPECT'
  | 'CAP_ACTION_CANCEL'
  | 'CAP_CONTACT_CALL'
  | 'CAP_MESSAGE_SEND'
  | 'CAP_LOCATION_READ'
  | 'CAP_LOCATION_SHARE'
  | 'CAP_CALENDAR_READ'
  | 'CAP_CALENDAR_WRITE'
  | 'CAP_EMERGENCY_TRIGGER';

export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PermissionStatus =
  | 'GRANTED'
  | 'DENIED'
  | 'BLOCKED'
  | 'NOT_REQUESTED'
  | 'UNSUPPORTED';

export interface PermissionDefinition {
  id: PermissionId;
  nameArabic: string;
  nameEnglish: string;
  descriptionArabic: string;
  descriptionEnglish: string;
  riskTier: RiskTier;
  androidPermission?: string;
  isGated: boolean;
  requiresUserConsent: boolean;
  requiresConfirmation: boolean;
}

export type TierStatus = 'ALLOWED' | 'CONFIRMATION_REQUIRED' | 'DENIED';

export interface TierEvaluationResult {
  status: TierStatus;
  riskTier: RiskTier;
  reasonCode: string;
  arabicMessage?: string;
  confirmationToken?: string;
  executionGrantToken?: string;
  expiresAt?: string;
}

export interface IPermissionProvider {
  checkPermission(permissionId: PermissionId): Promise<PermissionStatus>;
  requestPermission(permissionId: PermissionId): Promise<PermissionStatus>;
  checkAllPermissions(): Promise<Record<PermissionId, PermissionStatus>>;
}
