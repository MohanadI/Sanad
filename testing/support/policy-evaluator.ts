import crypto from 'node:crypto';
import { CAPABILITY_CONFIG, CapabilityId, RiskTier } from '@sanad/common';
import { StructuredAction, DeviceContext, PolicyEvaluationResponse } from './contracts.js';

export interface PolicyContext {
  userId: string;
  deviceId: string;
  action: StructuredAction;
  userGrants: Set<string>;
  osPermissions: Record<string, boolean>;
  deviceContext?: DeviceContext;
}

export const CAPABILITY_PERMISSIONS: Record<CapabilityId, string[]> = {
  CAP_ASSISTANT_QUERY: ['sanad:perm:system:query'],
  CAP_ALIAS_MANAGE: ['sanad:perm:alias:read', 'sanad:perm:alias:write'],
  CAP_SETTINGS_ACCESSIBILITY: [],
  CAP_AUDIT_INSPECT: ['sanad:perm:audit:read'],
  CAP_ACTION_CANCEL: [],

  // Deferred & Gated
  CAP_CONTACT_CALL: ['sanad:perm:contacts:read', 'sanad:perm:telephony:call'],
  CAP_MESSAGE_SEND: ['sanad:perm:contacts:read', 'sanad:perm:sms:send'],
  CAP_LOCATION_READ: ['sanad:perm:location:read'],
  CAP_LOCATION_SHARE: ['sanad:perm:location:read', 'sanad:perm:location:share'],
  CAP_CALENDAR_READ: ['sanad:perm:calendar:read'],
  CAP_CALENDAR_WRITE: ['sanad:perm:calendar:read', 'sanad:perm:calendar:write'],
  CAP_EMERGENCY_TRIGGER: ['sanad:perm:emergency:alert', 'sanad:perm:telephony:call'],
};

export const CAPABILITY_OS_PERMS: Partial<Record<CapabilityId, string>> = {
  CAP_CONTACT_CALL: 'android.permission.CALL_PHONE',
  CAP_MESSAGE_SEND: 'android.permission.SEND_SMS',
  CAP_LOCATION_READ: 'android.permission.ACCESS_FINE_LOCATION',
  CAP_LOCATION_SHARE: 'android.permission.ACCESS_FINE_LOCATION',
  CAP_CALENDAR_READ: 'android.permission.READ_CALENDAR',
  CAP_CALENDAR_WRITE: 'android.permission.WRITE_CALENDAR',
  CAP_EMERGENCY_TRIGGER: 'android.permission.CALL_PHONE',
};

export class DeterministicPolicyEvaluator {
  private hmacSecret: string;
  private consumedNonces: Set<string> = new Set();

  constructor(hmacSecret = 'sanad_test_ephemeral_secret_key_32bytes_long!') {
    this.hmacSecret = hmacSecret;
  }

  public setSecret(newSecret: string) {
    this.hmacSecret = newSecret;
  }

  public resetConsumedNonces() {
    this.consumedNonces.clear();
  }

  public isNonceConsumed(nonce: string): boolean {
    return this.consumedNonces.has(nonce);
  }

  public computeActionHash(action: StructuredAction): string {
    const canonical = JSON.stringify({
      intentId: action.intentId,
      targetCapability: action.targetCapability,
      slots: Object.keys(action.slots)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = action.slots[key];
          return acc;
        }, {}),
    });
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  public generateConfirmationToken(
    userId: string,
    action: StructuredAction,
    ttlSeconds = 30
  ): string {
    const nonce = crypto.randomUUID();
    const actionHash = this.computeActionHash(action);
    const issuedAt = Date.now();
    const expiresAt = issuedAt + ttlSeconds * 1000;

    const payload = JSON.stringify({
      type: 'CONFIRMATION',
      userId,
      actionHash,
      nonce,
      targetCapability: action.targetCapability,
      issuedAt,
      expiresAt,
    });

    const signature = crypto
      .createHmac('sha256', this.hmacSecret)
      .update(payload)
      .digest('base64url');

    return `ct_${Buffer.from(payload).toString('base64url')}.${signature}`;
  }

  public generateExecutionGrantToken(
    userId: string,
    action: StructuredAction,
    ttlSeconds = 10
  ): string {
    const nonce = crypto.randomUUID();
    const actionHash = this.computeActionHash(action);
    const issuedAt = Date.now();
    const expiresAt = issuedAt + ttlSeconds * 1000;

    const payload = JSON.stringify({
      type: 'EXECUTION_GRANT',
      userId,
      actionHash,
      nonce,
      targetCapability: action.targetCapability,
      issuedAt,
      expiresAt,
    });

    const signature = crypto
      .createHmac('sha256', this.hmacSecret)
      .update(payload)
      .digest('base64url');

    return `gt_${Buffer.from(payload).toString('base64url')}.${signature}`;
  }

  public verifyToken(
    rawToken: string,
    expectedType: 'CONFIRMATION' | 'EXECUTION_GRANT',
    expectedAction?: StructuredAction
  ): {
    valid: boolean;
    reasonCode?: string;
    payload?: any;
  } {
    const parts = rawToken.split('.');
    if (parts.length !== 2) {
      return { valid: false, reasonCode: 'TOKEN_ERR_MALFORMED' };
    }

    const [encodedPayload, signature] = parts;
    if (!encodedPayload || !signature) {
      return { valid: false, reasonCode: 'TOKEN_ERR_MALFORMED' };
    }

    let payloadStr: string;
    try {
      payloadStr = Buffer.from(
        encodedPayload.startsWith('ct_')
          ? encodedPayload.slice(3)
          : encodedPayload.startsWith('gt_')
          ? encodedPayload.slice(3)
          : encodedPayload,
        'base64url'
      ).toString('utf-8');
    } catch {
      return { valid: false, reasonCode: 'TOKEN_ERR_DECODE_FAILED' };
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.hmacSecret)
      .update(payloadStr)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return { valid: false, reasonCode: 'TOKEN_ERR_INVALID_SIGNATURE' };
    }

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(payloadStr);
    } catch {
      return { valid: false, reasonCode: 'TOKEN_ERR_CORRUPT_PAYLOAD' };
    }

    if (parsedPayload.type !== expectedType) {
      return { valid: false, reasonCode: 'TOKEN_ERR_TYPE_MISMATCH' };
    }

    if (Date.now() > parsedPayload.expiresAt) {
      return { valid: false, reasonCode: 'TOKEN_ERR_EXPIRED' };
    }

    if (this.consumedNonces.has(parsedPayload.nonce)) {
      return { valid: false, reasonCode: 'TOKEN_ERR_REPLAY_CONSUMED' };
    }

    if (expectedAction) {
      const expectedHash = this.computeActionHash(expectedAction);
      if (parsedPayload.actionHash !== expectedHash) {
        return { valid: false, reasonCode: 'TOKEN_ERR_ACTION_TAMPERED' };
      }
    }

    return { valid: true, payload: parsedPayload };
  }

  public consumeToken(rawToken: string, expectedType: 'CONFIRMATION' | 'EXECUTION_GRANT'): boolean {
    const verification = this.verifyToken(rawToken, expectedType);
    if (!verification.valid || !verification.payload) {
      return false;
    }
    this.consumedNonces.add(verification.payload.nonce);
    return true;
  }

  public evaluate(context: PolicyContext): PolicyEvaluationResponse {
    const { action, userGrants, osPermissions } = context;
    const capability = action.targetCapability;
    const config = CAPABILITY_CONFIG[capability];

    // 1. Static Capability Gate Check
    if (!config || !config.enabled) {
      return {
        status: 'DENIED',
        reasonCode: 'POLICY_ERR_CAPABILITY_DISABLED',
        arabicExplanation: 'هذه الميزة غير مفعلة حالياً في النظام حفاظاً على أمانك.',
        actionTaken: 'REJECTED_AUDITED',
      };
    }

    // 2. User Consent Check
    const requiredPerms = CAPABILITY_PERMISSIONS[capability] || [];
    for (const perm of requiredPerms) {
      if (!userGrants.has(perm)) {
        return {
          status: 'DENIED',
          reasonCode: 'POLICY_ERR_USER_CONSENT_MISSING',
          arabicExplanation: 'لم تقم بتفعيل إذن استخدام هذه الخاصية في الإعدادات.',
          actionTaken: 'REJECTED_AUDITED',
        };
      }
    }

    // 3. Android OS Runtime Permission Check
    const requiredOsPerm = CAPABILITY_OS_PERMS[capability];
    if (requiredOsPerm && !osPermissions[requiredOsPerm]) {
      return {
        status: 'DENIED',
        reasonCode: 'POLICY_ERR_OS_PERMISSION_DENIED',
        arabicExplanation: 'التطبيق يحتاج إلى إذن من نظام الهاتف لمتابعة هذا الطلب.',
        actionTaken: 'REJECTED_AUDITED',
      };
    }

    const riskTier = config.riskTier;
    const requiresConfirmation =
      riskTier === 'HIGH' || riskTier === 'CRITICAL' || action.requiresConfirmation;

    // 4. Risk-Based Confirmation Determination
    if (requiresConfirmation) {
      const confirmationToken = this.generateConfirmationToken(context.userId, action, 30);
      return {
        status: 'CONFIRMATION_REQUIRED',
        riskTier,
        reasonCode: 'POL_REQUIRE_AUDIO_CONFIRMATION',
        confirmationToken,
        arabicPrompt: this.buildArabicConfirmationPrompt(action),
        promptAudioCue: 'EARCON_CONFIRM_CHALLENGE',
        timeoutMs: 30000,
        expiresAt: new Date(Date.now() + 30000).toISOString(),
      };
    }

    // 5. Allow Direct Execution (LOW risk, unconfirmed)
    const executionGrantToken = this.generateExecutionGrantToken(context.userId, action, 10);
    return {
      status: 'ALLOWED',
      riskTier,
      reasonCode: 'POL_ALLOW_DIRECT_EXECUTION',
      executionGrantToken,
      expiresAt: new Date(Date.now() + 10000).toISOString(),
    };
  }

  private buildArabicConfirmationPrompt(action: StructuredAction): string {
    if (action.intentId === 'INTENT_ALIAS_CLEAR_ALL') {
      return 'هل تريد بالتأكيد حذف جميع الألقاب المسجلة لديك؟ قل نعم للمتابعة أو لا للإلغاء.';
    }
    if (action.intentId === 'INTENT_ALIAS_DELETE') {
      const alias = String(action.slots['aliasName'] ?? 'اللقب');
      return `هل تريد بالتأكيد حذف اللقب ${alias}؟ قل نعم أو لا.`;
    }
    if (action.intentId === 'INTENT_ALIAS_SET' && action.requiresConfirmation) {
      const alias = String(action.slots['aliasName'] ?? '');
      const contact = String(action.slots['targetContactName'] ?? action.slots['targetContact'] ?? '');
      return `هذا اللقب موجود مسبقاً. هل تريد استبدال اللقب ${alias} لجهة الاتصال ${contact}؟ قل نعم أو لا.`;
    }
    return 'هل تريد الاستمرار في تنفيذ هذا الإجراء؟ قل نعم للمتابعة أو لا للإلغاء.';
  }
}
