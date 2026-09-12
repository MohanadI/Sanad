# Sanad Permission Matrix & Authorization Model

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Classification:** Security Architecture Specification  

---

## 1. Principles of Permission Enforcement

Sanad operates under an absolute **Deny-by-Default** security posture. No action can be initiated or executed unless it satisfies a four-tier deterministic authorization check:

```text
       Incoming User Request
                 │
                 ▼
    ┌───────────────────────────┐
    │  Tier 1: Feature Gate      │ ──[DISABLED]──► DENY (Capability Inactive)
    │  (Static Capability Flag) │
    └────────────┬──────────────┘
                 │ [ENABLED]
                 ▼
    ┌───────────────────────────┐
    │  Tier 2: User Permission   │ ──[NOT GRANTED]──► DENY (User Consent Missing)
    │  (Stored Consent in Vault)│
    └────────────┬──────────────┘
                 │ [GRANTED]
                 ▼
    ┌───────────────────────────┐
    │  Tier 3: OS Runtime Perm   │ ──[DENIED]──► PROMPT OS PERMISSION / DENY
    │  (Android Runtime API)    │
    └────────────┬──────────────┘
                 │ [AUTHORIZED]
                 ▼
    ┌───────────────────────────┐
    │  Tier 4: Action Challenge  │ ──[REJECTED/TIMEOUT]──► ABORT & AUDIT
    │  (Risk-Based Confirmation)│
    └────────────┬──────────────┘
                 │ [CONFIRMED]
                 ▼
         AUTHORIZATION TOKEN
      (Single-Use, HMAC-Signed)
```

---

## 2. Granular Permission Definitions

The system decouples permissions into granular scopes rather than coarse bundles:

| Permission Identifier | Scope | Type | Description |
|---|---|---|---|
| `sanad:perm:system:query` | Core System | User Consent | Read general help, status, time, and system assistance. |
| `sanad:perm:alias:read` | Contact Aliases | User Consent | Read custom kinship and nickname mappings. |
| `sanad:perm:alias:write` | Contact Aliases | User Consent | Add, modify, or delete contact nicknames and aliases. |
| `sanad:perm:audit:read` | Privacy / Logs | User Consent | Inspect audit history and access records. |
| `sanad:perm:contacts:read` | Contact Data | OS + User Consent | Access local address book to resolve names and phone numbers. |
| `sanad:perm:telephony:call` | Telephony | OS + User Consent + Confirmation | Initiate native cellular phone calls. *(Gated)* |
| `sanad:perm:sms:send` | Messaging | OS + User Consent + Confirmation | Compose and dispatch SMS messages. *(Gated)* |
| `sanad:perm:location:read` | Geolocation | OS + User Consent | Access current device GPS coordinates. *(Gated)* |
| `sanad:perm:location:share`| Geolocation | OS + User Consent + Confirmation | Transmit location link to a third party. *(Gated)* |
| `sanad:perm:calendar:read` | Scheduling | OS + User Consent | Query upcoming appointments. *(Gated)* |
| `sanad:perm:calendar:write`| Scheduling | OS + User Consent + Confirmation | Insert, update, or cancel calendar entries. *(Gated)* |
| `sanad:perm:emergency:alert`| Life Safety | System + User Consent | Trigger emergency contact escalation workflow. *(Gated)* |

---

## 3. Comprehensive Permission & Confirmation Matrix

| Capability Identifier | Required Permissions | Android OS Permission | Risk Tier | Runtime Confirmation Required? | Confirmation Modality |
|---|---|---|---|---|---|
| `CAP_ASSISTANT_QUERY` | `sanad:perm:system:query` | None | `LOW` | **No** | None |
| `CAP_ALIAS_MANAGE` | `sanad:perm:alias:read`, `sanad:perm:alias:write` | None | `LOW` | **Yes (Always)** | Spoken name + Yes/No |
| `CAP_SETTINGS_ACCESSIBILITY` | None | None | `LOW` | **No** | Earcon audio acknowledgment |
| `CAP_AUDIT_INSPECT` | `sanad:perm:audit:read` | None | `LOW` | **No** | Spoken audio summary |
| `CAP_ACTION_CANCEL` | None | None | `LOW` | **No** | Immediate silence + earcon |
| `CAP_CONTACT_CALL` *(Gated)* | `sanad:perm:contacts:read`, `sanad:perm:telephony:call` | `android.permission.CALL_PHONE` | `HIGH` | **Yes (Always)** | Spoken name + Yes/No |
| `CAP_MESSAGE_SEND` *(Gated)* | `sanad:perm:contacts:read`, `sanad:perm:sms:send` | `android.permission.SEND_SMS` | `HIGH` | **Yes (Always)** | Full message read-back + Yes/No |
| `CAP_LOCATION_READ` *(Gated)* | `sanad:perm:location:read` | `android.permission.ACCESS_FINE_LOCATION` | `MEDIUM` | **Yes (Always)** | Earcon warning + Spoken description |
| `CAP_LOCATION_SHARE` *(Gated)* | `sanad:perm:location:read`, `sanad:perm:location:share` | `android.permission.ACCESS_FINE_LOCATION` | `HIGH` | **Yes (Always)** | Spoken recipient + Yes/No |
| `CAP_CALENDAR_READ` *(Gated)* | `sanad:perm:calendar:read` | `android.permission.READ_CALENDAR` | `LOW` | **No** | Spoken agenda summary |
| `CAP_CALENDAR_WRITE` *(Gated)* | `sanad:perm:calendar:read`, `sanad:perm:calendar:write` | `android.permission.WRITE_CALENDAR` | `MEDIUM` | **Yes (Always)** | Date/time read-back + Yes/No |
| `CAP_EMERGENCY_TRIGGER` *(Gated)* | `sanad:perm:emergency:alert`, `sanad:perm:telephony:call` | `android.permission.CALL_PHONE` | `CRITICAL` | **Autonomous Local Protocol** (5s countdown with audible cancel option) | Countdown beep + "إلغاء" keyword |

---

## 4. Deterministic Evaluation Algorithm (Governed by ADR-004)

The Policy Engine implements the following deterministic evaluation algorithm in TypeScript. In accordance with **ADR-004**, confirmation requirements are dictated strictly by an authoritative server-side lookup table, ignoring any client- or AI-provided metadata:

```typescript
export const CAPABILITY_CONFIRMATION_RULES: Record<CapabilityId, 'ALWAYS' | 'CONDITIONAL' | 'NEVER'> = {
  CAP_ASSISTANT_QUERY: 'NEVER',
  CAP_ALIAS_MANAGE: 'ALWAYS',
  CAP_SETTINGS_ACCESSIBILITY: 'NEVER',
  CAP_AUDIT_INSPECT: 'NEVER',
  CAP_ACTION_CANCEL: 'NEVER',
  CAP_CONTACT_CALL: 'ALWAYS',
  CAP_MESSAGE_SEND: 'ALWAYS',
  CAP_LOCATION_READ: 'ALWAYS',
  CAP_LOCATION_SHARE: 'ALWAYS',
  CAP_CALENDAR_READ: 'NEVER',
  CAP_CALENDAR_WRITE: 'ALWAYS',
  CAP_EMERGENCY_TRIGGER: 'ALWAYS',
};

export interface PolicyContext {
  userId: string;
  deviceId: string;
  action: StructuredAction;
  userGrants: Set<string>;
  osPermissions: Record<string, boolean>;
}

export function evaluatePolicy(context: PolicyContext): PolicyEvaluationResult {
  const { action, userGrants, osPermissions } = context;
  const capability = action.targetCapability;

  // 1. Static Capability Gate Check
  if (!CAPABILITY_CONFIG[capability]?.enabled) {
    return {
      status: 'DENIED',
      code: 'POLICY_ERR_CAPABILITY_DISABLED',
      arabicMessage: 'هذه الميزة غير مفعلة حالياً في النظام حفاظاً على أمانك.',
    };
  }

  // 2. User Consent Check
  const requiredPerms = CAPABILITY_PERMISSIONS[capability];
  for (const perm of requiredPerms) {
    if (!userGrants.has(perm)) {
      return {
        status: 'DENIED',
        code: 'POLICY_ERR_USER_CONSENT_MISSING',
        arabicMessage: 'لم تقم بتفعيل إذن استخدام هذه الخاصية في الإعدادات.',
      };
    }
  }

  // 3. Android OS Runtime Permission Check
  const requiredOsPerm = CAPABILITY_OS_PERMS[capability];
  if (requiredOsPerm && !osPermissions[requiredOsPerm]) {
    return {
      status: 'DENIED',
      code: 'POLICY_ERR_OS_PERMISSION_DENIED',
      arabicMessage: 'التطبيق يحتاج إلى إذن من نظام الهاتف لمتابعة هذا الطلب.',
    };
  }

  // 4. Authoritative Confirmation Determination (ADR-004)
  // Completely ignores action.requiresConfirmation flag to prevent confirmation suppression
  const confirmationPolicy = CAPABILITY_CONFIRMATION_RULES[capability];
  const requiresConfirmation = confirmationPolicy === 'ALWAYS';
  const risk = CAPABILITY_RISK_TIERS[capability];

  if (requiresConfirmation) {
    const confirmationToken = generateHmacConfirmationToken(context);
    return {
      status: 'CONFIRMATION_REQUIRED',
      riskTier: risk,
      confirmationToken,
      arabicPrompt: buildArabicConfirmationPrompt(action),
      timeoutMs: 30000, // 30 seconds expiration
    };
  }

  // 5. Allow Direct Execution (LOW risk actions with verified permissions)
  const executionToken = generateExecutionGrantToken(context);
  return {
    status: 'ALLOWED',
    riskTier: risk,
    executionToken,
  };
}
```

---

## 5. Revocation, Expiration, and Audit Rules

1. **Immediate Revocation:** If a user revokes an in-app permission or changes an OS setting, all active sessions and cached capability tokens are invalidated immediately.
2. **Anti-Replay, Nonce & Parameter Binding (ADR-004):** Every `confirmationToken` and `executionGrantToken` contains:
   - Unique UUIDv4 nonce tracked in an anti-replay consumption store.
   - Cryptographic parameter binding hash: `actionHash = SHA-256(targetCapability + canonical(parameters))`.
   - Strict Time-To-Live (TTL): 30 seconds for confirmation challenges; 10 seconds for execution grants.
   - Single-use consumption guarantee (marked consumed on verification).
3. **Audit Logging & Sovereign Privacy (ADR-006):** Every rejection, permission failure, timeout, or approval is logged to the immutable audit database with the deterministic policy reason code. Under no circumstances are raw telephone numbers or reversible hashes stored in audit records.
