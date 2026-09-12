import { CapabilityId, TierEvaluationResult } from './types';
import { CAPABILITY_PERMISSIONS_MAP } from './permissionRegistry';
import { t } from '../localization/i18n';

export interface EvaluationContext {
  capabilityId: CapabilityId;
  userGrants: Set<string>;
  osPermissions: Record<string, boolean>;
  featureGates: Record<CapabilityId, boolean>;
  isConditionalOverwrite?: boolean;
}

/**
 * Deterministic Four-Tier Authorization Evaluation.
 * Matches docs/architecture/PERMISSION_MATRIX.md Section 4.
 */
export function evaluatePermissionTiers(context: EvaluationContext): TierEvaluationResult {
  const { capabilityId, userGrants, osPermissions, featureGates, isConditionalOverwrite } = context;
  const mapping = CAPABILITY_PERMISSIONS_MAP[capabilityId];

  if (!mapping) {
    return {
      status: 'DENIED',
      riskTier: 'CRITICAL',
      reasonCode: 'POLICY_ERR_UNKNOWN_CAPABILITY',
      arabicMessage: t('error_unauthorized'),
    };
  }

  const { requiredPermissions, osPermission, riskTier, requiresConfirmation } = mapping;

  // 1. Tier 1: Static Capability Feature Gate Check
  if (!featureGates[capabilityId]) {
    let gateMessage = t('error_unauthorized');
    switch (capabilityId) {
      case 'CAP_CONTACT_CALL':
        gateMessage = t('gate_call_disabled');
        break;
      case 'CAP_MESSAGE_SEND':
        gateMessage = t('gate_sms_disabled');
        break;
      case 'CAP_LOCATION_READ':
      case 'CAP_LOCATION_SHARE':
        gateMessage = t('gate_location_disabled');
        break;
      case 'CAP_CALENDAR_READ':
      case 'CAP_CALENDAR_WRITE':
        gateMessage = t('gate_calendar_disabled');
        break;
      case 'CAP_EMERGENCY_TRIGGER':
        gateMessage = t('gate_emergency_disabled');
        break;
    }

    return {
      status: 'DENIED',
      riskTier,
      reasonCode: 'POLICY_ERR_CAPABILITY_DISABLED',
      arabicMessage: gateMessage,
    };
  }

  // 2. Tier 2: User Consent Check
  for (const perm of requiredPermissions) {
    if (!userGrants.has(perm)) {
      return {
        status: 'DENIED',
        riskTier,
        reasonCode: 'POLICY_ERR_USER_CONSENT_MISSING',
        arabicMessage: 'لم تقم بتفعيل إذن استخدام هذه الخاصية في الإعدادات.',
      };
    }
  }

  // 3. Tier 3: OS Runtime Permission Check
  if (osPermission && !osPermissions[osPermission]) {
    return {
      status: 'DENIED',
      riskTier,
      reasonCode: 'POLICY_ERR_OS_PERMISSION_DENIED',
      arabicMessage: 'التطبيق يحتاج إلى إذن من نظام الهاتف لمتابعة هذا الطلب.',
    };
  }

  // 4. Tier 4: Action Challenge / Confirmation Determination
  const needsConfirmation =
    requiresConfirmation ||
    riskTier === 'HIGH' ||
    riskTier === 'CRITICAL' ||
    (capabilityId === 'CAP_ALIAS_MANAGE' && isConditionalOverwrite);

  if (needsConfirmation) {
    const confirmationToken = `ct_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = new Date(Date.now() + 30000).toISOString(); // 30-second TTL

    return {
      status: 'CONFIRMATION_REQUIRED',
      riskTier,
      reasonCode: 'POLICY_REQUIRE_ACTION_CONFIRMATION',
      arabicMessage: t('confirm_prompt_general'),
      confirmationToken,
      expiresAt,
    };
  }

  // 5. Direct Execution Allowed
  const executionGrantToken = `gt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const expiresAt = new Date(Date.now() + 10000).toISOString(); // 10-second TTL

  return {
    status: 'ALLOWED',
    riskTier,
    reasonCode: 'POLICY_ALLOW_DIRECT_EXECUTION',
    executionGrantToken,
    expiresAt,
  };
}
