import { CapabilityId } from '../permissions/types';

export interface CapabilityConfigItem {
  enabled: boolean;
  requiresAuth: boolean;
  reason?: string;
}

export const CAPABILITY_CONFIG: Record<CapabilityId, CapabilityConfigItem> = {
  CAP_ASSISTANT_QUERY: { enabled: true, requiresAuth: true },
  CAP_ALIAS_MANAGE: { enabled: true, requiresAuth: true },
  CAP_SETTINGS_ACCESSIBILITY: { enabled: true, requiresAuth: false },
  CAP_AUDIT_INSPECT: { enabled: true, requiresAuth: true },
  CAP_ACTION_CANCEL: { enabled: true, requiresAuth: false },

  // GATED / DEFERRED (Strictly disabled)
  CAP_CONTACT_CALL: { enabled: false, requiresAuth: true, reason: 'DEFERRED_PHASE_1_GOVERNANCE' },
  CAP_MESSAGE_SEND: { enabled: false, requiresAuth: true, reason: 'DEFERRED_PHASE_1_GOVERNANCE' },
  CAP_LOCATION_READ: { enabled: false, requiresAuth: true, reason: 'DEFERRED_PHASE_1_GOVERNANCE' },
  CAP_LOCATION_SHARE: { enabled: false, requiresAuth: true, reason: 'DEFERRED_PHASE_1_GOVERNANCE' },
  CAP_CALENDAR_READ: { enabled: false, requiresAuth: true, reason: 'DEFERRED_PHASE_1_GOVERNANCE' },
  CAP_CALENDAR_WRITE: { enabled: false, requiresAuth: true, reason: 'DEFERRED_PHASE_1_GOVERNANCE' },
  CAP_EMERGENCY_TRIGGER: { enabled: false, requiresAuth: true, reason: 'DEFERRED_PHASE_1_GOVERNANCE' },
} as const;
