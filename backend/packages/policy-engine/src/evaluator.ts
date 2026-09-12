import {
  CAPABILITY_CONFIG,
  CAPABILITY_PERMISSIONS,
  CAPABILITY_OS_PERMS,
  CAPABILITY_CONFIRMATION_RULES,
  MESSAGE_KEYS,
  t,
  type PolicyEvaluateResponse,
  type StructuredAction,
  type PermissionId,
} from '@sanad/common';
import type { PolicyContext } from './types.js';
import type { TokenService } from './tokens.js';

export function evaluatePolicyDeterministic(
  context: PolicyContext,
  tokenService: TokenService
): PolicyEvaluateResponse {
  const { action, osPermissions } = context;
  const capability = action.targetCapability;
  const config = CAPABILITY_CONFIG[capability];

  // 1. Static Capability Feature Gate Check
  if (!config || !config.enabled) {
    return {
      status: 'DENIED',
      reasonCode: 'POLICY_ERR_CAPABILITY_DISABLED',
      arabicExplanation: t(MESSAGE_KEYS.POLICY_CAPABILITY_DISABLED, 'ar-PS'),
      actionTaken: 'REJECTED_AUDITED',
      messageKey: MESSAGE_KEYS.POLICY_CAPABILITY_DISABLED,
    };
  }

  // 2. User Consent Check
  const grantsSet = new Set<string>(context.userGrants);
  const requiredPerms = CAPABILITY_PERMISSIONS[capability] ?? [];
  for (const perm of requiredPerms) {
    if (!grantsSet.has(perm)) {
      return {
        status: 'DENIED',
        reasonCode: 'POLICY_ERR_USER_CONSENT_MISSING',
        arabicExplanation: t(MESSAGE_KEYS.POLICY_USER_CONSENT_MISSING, 'ar-PS'),
        actionTaken: 'REJECTED_AUDITED',
        messageKey: MESSAGE_KEYS.POLICY_USER_CONSENT_MISSING,
      };
    }
  }

  // 3. Android OS Runtime Permission Check
  const requiredOsPerm = CAPABILITY_OS_PERMS[capability];
  if (requiredOsPerm && !osPermissions[requiredOsPerm]) {
    return {
      status: 'DENIED',
      reasonCode: 'POLICY_ERR_OS_PERMISSION_DENIED',
      arabicExplanation: t(MESSAGE_KEYS.POLICY_OS_PERMISSION_DENIED, 'ar-PS'),
      actionTaken: 'REJECTED_AUDITED',
      messageKey: MESSAGE_KEYS.POLICY_OS_PERMISSION_DENIED,
    };
  }

  // Determine toolName and compute action hash for cryptographic token parameter binding (ADR-004)
  const toolName = resolveDefaultToolName(capability);
  const actionHash = tokenService.computeActionHash(toolName, action.slots);
  const risk = config.riskTier;

  // 4. Authoritative Confirmation Policy Enforcement (ADR-004)
  // Strictly ignore action.requiresConfirmation from client/AI.
  const confirmationRule = CAPABILITY_CONFIRMATION_RULES[capability];
  const requiresConfirmation = confirmationRule === 'ALWAYS';

  if (requiresConfirmation) {
    const { token, expiresAt } = tokenService.generateConfirmationToken(
      action.actionId,
      context.userId,
      capability,
      actionHash
    );

    const { promptArabic, messageKey } = buildConfirmationPrompt(action);

    return {
      status: 'CONFIRMATION_REQUIRED',
      riskTier: risk,
      confirmationToken: token,
      arabicPrompt: promptArabic,
      promptAudioCue: 'EARCON_CONFIRMATION_CHALLENGE',
      expiresAt,
      messageKey,
    };
  }

  // 5. Allow Direct Execution (LOW risk actions with verified permissions)
  const { token, expiresAt } = tokenService.generateExecutionGrantToken(
    action.actionId,
    context.userId,
    capability,
    toolName,
    actionHash
  );

  return {
    status: 'ALLOWED',
    riskTier: risk,
    executionGrantToken: token,
    expiresAt,
    messageKey: MESSAGE_KEYS.POLICY_ALLOWED,
  };
}

function resolveDefaultToolName(capability: string): string {
  switch (capability) {
    case 'CAP_ASSISTANT_QUERY':
      return 'TOOL_ASSISTANT_QUERY';
    case 'CAP_ACTION_CANCEL':
      return 'TOOL_ACTION_CANCEL';
    case 'CAP_ALIAS_MANAGE':
      return 'TOOL_ALIAS_LIST';
    default:
      return `TOOL_${capability}`;
  }
}

export function buildConfirmationPrompt(action: StructuredAction): {
  promptArabic: string;
  messageKey: string;
} {
  const slots = action.slots as Record<string, string | number>;

  switch (action.intentId) {
    case 'INTENT_ALIAS_SET': {
      const key = MESSAGE_KEYS.CONFIRM_ALIAS_SET;
      return {
        promptArabic: t(key, 'ar-PS', {
          aliasName: slots.aliasName ?? 'اللقب',
          targetContact: slots.targetContact ?? 'جهة الاتصال',
        }),
        messageKey: key,
      };
    }
    case 'INTENT_ALIAS_DELETE': {
      const key = MESSAGE_KEYS.CONFIRM_ALIAS_DELETE;
      return {
        promptArabic: t(key, 'ar-PS', {
          aliasName: slots.aliasName ?? 'اللقب',
        }),
        messageKey: key,
      };
    }
    case 'INTENT_CONTACT_CALL': {
      const key = MESSAGE_KEYS.CONFIRM_CONTACT_CALL;
      return {
        promptArabic: t(key, 'ar-PS', {
          targetContact: slots.targetContact ?? 'جهة الاتصال',
        }),
        messageKey: key,
      };
    }
    case 'INTENT_MESSAGE_SEND': {
      const key = MESSAGE_KEYS.CONFIRM_MESSAGE_SEND;
      return {
        promptArabic: t(key, 'ar-PS', {
          targetContact: slots.targetContact ?? 'جهة الاتصال',
          body: slots.body ?? '',
        }),
        messageKey: key,
      };
    }
    case 'INTENT_LOCATION_SHARE': {
      const key = MESSAGE_KEYS.CONFIRM_LOCATION_SHARE;
      return {
        promptArabic: t(key, 'ar-PS', {
          targetContact: slots.targetContact ?? 'جهة الاتصال',
        }),
        messageKey: key,
      };
    }
    case 'INTENT_CALENDAR_CREATE': {
      const key = MESSAGE_KEYS.CONFIRM_CALENDAR_WRITE;
      return {
        promptArabic: t(key, 'ar-PS', {
          eventTitle: slots.eventTitle ?? 'الموعد',
          startTime: slots.startTime ?? '',
        }),
        messageKey: key,
      };
    }
    case 'INTENT_EMERGENCY_TRIGGER': {
      const key = MESSAGE_KEYS.CONFIRM_EMERGENCY_TRIGGER;
      return {
        promptArabic: t(key, 'ar-PS'),
        messageKey: key,
      };
    }
    default: {
      const key = MESSAGE_KEYS.CONFIRM_CHALLENGE_DEFAULT;
      return {
        promptArabic: t(key, 'ar-PS'),
        messageKey: key,
      };
    }
  }
}
