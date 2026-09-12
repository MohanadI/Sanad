# Sanad Phase 2 Architecture Security Review

**Document Version:** 1.0.0  
**Date:** 2026-09-12  
**Review Status:** Completed — Action Required Before Phase 3 Implementation  
**Reviewer:** Sanad Security Engineer  
**Scope:** Pre-Implementation Architecture Review of Master Plan, Architecture Specifications, Decisions, and Security Baseline  

---

## 1. Executive Summary & Review Scope

This security review was conducted prior to Phase 3 MVP code implementation to audit the architectural foundations, boundary definitions, data contracts, and threat mitigations across:
- `SANAD_MASTER_PLAN.md`
- `docs/architecture/` (`SYSTEM_ARCHITECTURE.md`, `COMPONENT_BOUNDARIES.md`, `PERMISSION_MATRIX.md`, `CAPABILITY_MATRIX.md`, `API_CONTRACTS.md`)
- `docs/decisions/` (`ADR-001.md`, `ADR-002.md`, `ADR-003.md`)
- `docs/security/` (`SECURITY_MODEL.md`, `THREAT_MODEL.md`, `DATA_CLASSIFICATION.md`, `INCIDENT_RESPONSE.md`, `PRIVACY.md`)

The Sanad platform is an Arabic-first assistive accessibility platform for blind and visually impaired Palestinian users. Because these users interact with real-world mobile services primarily through voice and audio without visual screen inspection, system security, deterministic authorization, and sovereign privacy are life-safety requirements.

### Summary of Audit Findings

| Severity | Count | Primary Impact Areas |
|---|---|---|
| **P0 (Critical / Exploit)** | 2 | Authorization Bypass (Confirmation Suppression); Tool Parameter Tampering & Action Substitution |
| **P1 (Boundary Failure)** | 4 | Life-Safety Emergency Offline Failure; Rainbow Table Phone Cracking; Confused Deputy Client Pipeline; Plaintext Contact Name Leakage |
| **P2 (Security Weakness)** | 4 | Semantic Contact Shadowing/Hijacking; Public Geolocation Audio Leak; In-Memory Token Replay Loss; Ambient Acoustic Spoofing |
| **P3 (Normal Issue)** | 2 | Clock Skew / Key Rotation Invalidation; Missing Tiered Rate Limiting on Voice API |

> [!CAUTION]
> **Implementation Gate Blocker:** Implementation of Phase 3 capabilities must not begin until the **P0** and **P1** architectural remediations specified herein are adopted by the Solution Architect and integrated into the architecture baseline.

---

## 2. Review Area Analysis

### 2.1. Policy Boundary & Permission Matrix
The core axiom of Sanad is: *"The AI may propose an action, but only the deterministic Policy Engine may authorize it, and only a bounded Tool Executor may execute it."*
- **Strength:** Strict deny-by-default posture; non-probabilistic rule evaluation; static feature flags (`CAPABILITY_CONFIG`) effectively gate deferred high-risk capabilities (`CALL`, `MESSAGE`, `LOCATION`, `CALENDAR`, `EMERGENCY`).
- **Defect (P0):** The evaluation algorithm in `PERMISSION_MATRIX.md` contains a logical flaw where `MEDIUM` risk actions (e.g. `CAP_CALENDAR_WRITE`) bypass mandatory confirmation unless `action.requiresConfirmation` is provided. Crucially, the engine evaluates client/AI-supplied `action.requiresConfirmation` rather than an authoritative, immutable server-side matrix.
- **Defect (P2):** `CAP_ALIAS_MANAGE` allows unconfirmed registration of new contact aliases, enabling semantic contact shadowing.

### 2.2. Tool Interfaces & Cryptographic Token Protocol
- **Strength:** Two-phase token flow (`confirmationToken` -> `executionGrantToken`) with HMAC-SHA256 signatures and anti-replay nonces.
- **Defect (P0):** `POST /v1/tools/execute` accepts tool parameters from the request payload. If the executor only validates the token signature and expiration, an attacker or compromised client can substitute parameters (e.g., changing recipient or payload) using a valid token issued for a different action.
- **Defect (P2):** Nonce consumption is tracked in-memory, failing across multi-worker clusters or backend process restarts.

### 2.3. AI Trust Boundary & Structured-Output Attacks
- **Strength:** ADR-001 firmly decouples AI intent interpretation from policy evaluation; Zod schema validation strips undeclared properties; static import restrictions prevent AI from accessing tool executors.
- **Defect (P1):** The API contract splits interpretation (`POST /v1/assistant/interpret`) and policy evaluation (`POST /v1/policy/evaluate`) into separate client-orchestrated calls. The client receives unauthenticated `actionCandidate` JSON and forwards it to the policy endpoint. This allows an attacker or client malware to bypass NLP and directly inject arbitrary structured actions as a Confused Deputy.

### 2.4. Audit Design & Data Protection
- **Strength:** Append-only PostgreSQL audit log; zero retention of raw audio buffers; column-level encryption for stored user preferences.
- **Defect (P1):** Audit logging specifies `hash(phone + salt)`. Because Palestinian phone numbers have an extremely small entropy space ($\le 2 \times 10^7$ numbers), a salted SHA-256 hash can be cracked in milliseconds using standard rainbow tables, destroying user privacy.
- **Defect (P1):** `GET /v1/contacts/aliases` and tool responses expose plaintext contact real names (`"هدى"`), violating the Palestinian Sovereign Privacy policy which mandates address book data never leave the local device.

### 2.5. Emergency Assumptions & Resiliency
- **Strength:** Emergency capability is designated `CRITICAL` risk; static feature gate prevents premature activation.
- **Defect (P1):** The architecture models emergency workflows as a backend roundtrip through the cloud API Gateway. In Palestine, where checkpoints, rural travel, and network disruptions frequently sever connectivity, an online-dependent emergency call will timeout and fail. Emergency triggering must be an autonomous, 100% on-device native Android subsystem.

---

## 3. Detailed Security Findings

### Finding SEC-P0-01: Authorization Bypass via Client/AI-Controlled Confirmation Suppression
- **Severity:** `P0` (Unauthorized Sensitive Action / Active Exploit)
- **Status:** Open (Architecture Defect)
- **Affected Files:**
  - `docs/architecture/PERMISSION_MATRIX.md` (lines 136–146)
  - `docs/architecture/CAPABILITY_MATRIX.md` (Section 2, line 36)
  - `docs/architecture/API_CONTRACTS.md` (lines 50–65)

#### Threat Description
In `PERMISSION_MATRIX.md`, the deterministic evaluation algorithm implements:
```typescript
// 4. Risk-Based Confirmation Determination
const risk = CAPABILITY_RISK_TIERS[capability];
if (risk === 'HIGH' || risk === 'CRITICAL' || action.requiresConfirmation) {
  const confirmationToken = generateHmacConfirmationToken(context);
  return {
    status: 'CONFIRMATION_REQUIRED',
    riskTier: risk,
    confirmationToken,
    arabicPrompt: buildArabicConfirmationPrompt(action),
    timeoutMs: 30000,
  };
}

// 5. Allow Direct Execution
const executionToken = generateExecutionGrantToken(context);
return { status: 'ALLOWED', riskTier: risk, executionToken };
```
This introduces two catastrophic authorization flaws:
1. **`MEDIUM` Risk Blindspot:** In the Capability Matrix, `CAP_CALENDAR_WRITE` is designated `MEDIUM` risk, but requires `Yes (Always)` confirmation. In the code above, because `risk === 'MEDIUM'`, the condition evaluates to `false` unless `action.requiresConfirmation` is true.
2. **Untrusted Parameter Influence:** `action.requiresConfirmation` is emitted by the untrusted Intent Classifier (`POST /v1/assistant/interpret`) and transmitted by the client. An attacker, prompt injection payload, or compromised client can set `requiresConfirmation: false`. The Policy Engine will immediately issue an `executionGrantToken` (`ALLOWED`), executing the sensitive action without user confirmation.

#### Reproduction Scenario
1. Attacker sends a crafted request to `POST /v1/policy/evaluate`:
   ```json
   {
     "action": {
       "intentId": "INTENT_CALENDAR_WRITE",
       "targetCapability": "CAP_CALENDAR_WRITE",
       "requiresConfirmation": false,
       "slots": {
         "eventTitle": "Unauthorized Meeting",
         "startTime": "2026-09-15T10:00:00Z"
       }
     },
     "deviceContext": { "deviceId": "dev_test", "osPermissionsGranted": ["android.permission.WRITE_CALENDAR"] }
   }
   ```
2. Policy Engine evaluates `risk = CAPABILITY_RISK_TIERS['CAP_CALENDAR_WRITE']` (`'MEDIUM'`).
3. The check `risk === 'HIGH' || risk === 'CRITICAL' || action.requiresConfirmation` evaluates to `false`.
4. Policy Engine returns `status: 'ALLOWED'` and issues an `executionGrantToken`.
5. Tool executes without the blind user ever hearing a confirmation challenge.

#### Remediation
Remove all reliance on `action.requiresConfirmation`. Enforce an authoritative server-side confirmation policy lookup:
```typescript
export const CAPABILITY_CONFIRMATION_RULES: Record<CapabilityId, 'ALWAYS' | 'CONDITIONAL' | 'NEVER'> = {
  CAP_ASSISTANT_QUERY: 'NEVER',
  CAP_ALIAS_MANAGE: 'ALWAYS', // Updated per SEC-P2-01
  CAP_SETTINGS_ACCESSIBILITY: 'NEVER',
  CAP_AUDIT_INSPECT: 'NEVER',
  CAP_ACTION_CANCEL: 'NEVER',
  CAP_CONTACT_CALL: 'ALWAYS',
  CAP_MESSAGE_SEND: 'ALWAYS',
  CAP_LOCATION_READ: 'ALWAYS', // Updated per SEC-P2-02
  CAP_LOCATION_SHARE: 'ALWAYS',
  CAP_CALENDAR_READ: 'NEVER',
  CAP_CALENDAR_WRITE: 'ALWAYS',
  CAP_EMERGENCY_TRIGGER: 'ALWAYS',
};

// Inside evaluatePolicy:
const confirmationPolicy = CAPABILITY_CONFIRMATION_RULES[capability];
const mustConfirm = confirmationPolicy === 'ALWAYS' || 
  (confirmationPolicy === 'CONDITIONAL' && evaluateConditionalConfirmation(action, context));

if (mustConfirm) {
  return generateConfirmationChallenge(context);
}
```

#### Verification Plan
Author automated unit test `test_policy_engine_overrides_client_confirmation_flag()` asserting that even if `action.requiresConfirmation === false`, any capability marked `ALWAYS` or evaluated as `CONDITIONAL` strictly returns `CONFIRMATION_REQUIRED`.

---

### Finding SEC-P0-02: Tool Parameter Tampering & Action Substitution via Unbound `executionGrantToken`
- **Severity:** `P0` (Unauthorized Sensitive Action / Parameter Tampering)
- **Status:** Open (Architecture Defect)
- **Affected Files:**
  - `docs/architecture/API_CONTRACTS.md` (lines 164–178)
  - `docs/security/SECURITY_MODEL.md` (lines 73–89)
  - `docs/architecture/COMPONENT_BOUNDARIES.md` (lines 136–154)

#### Threat Description
In `API_CONTRACTS.md`, the tool execution interface is defined as:
```json
POST /v1/tools/execute
{
  "toolName": "TOOL_ALIAS_REGISTER",
  "executionGrantToken": "gt_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "parameters": {
    "aliasName": "مرتي",
    "contactId": "cnt_550e8400-e29b-41d4-a716-446655440000"
  }
}
```
And in `BoundedToolExecutor`:
```typescript
execute(input: TInput, authGrant: ExecutionAuthToken): Promise<ToolResult<TOutput>>;
```
The token payload defined in `SECURITY_MODEL.md` contains:
`Payload = { actionId, userId, actionHash, nonce, issuedAt, expiresAt }` where `actionHash = SHA-256(targetCapability + canonicalParams)`.
The vulnerability arises because the client passes `parameters` separately from the token. If the executor only checks `verifyAuthToken(authGrant)` (valid signature and non-expired timestamp) without verifying that `SHA-256(canonical(toolName + parameters)) === authGrant.actionHash`:
1. An attacker can obtain a valid `executionGrantToken` for an innocuous action (e.g., alias update with safe parameters).
2. The attacker calls `POST /v1/tools/execute` using the valid token, but substitutes malicious parameters in the body (e.g. pointing the alias to an attacker contact ID).
3. The tool executes the malicious parameters using the legitimate token.

#### Reproduction Scenario
1. User confirms linking nickname "مرتي" to contact ID `cnt_legitimate`.
2. Policy Engine issues valid `executionGrantToken` `gt_123` with `actionHash = SHA-256('CAP_ALIAS_MANAGE' + 'مرتي' + 'cnt_legitimate')`.
3. Client proxy / attacker intercepts the request and submits to `POST /v1/tools/execute`:
   ```json
   {
     "toolName": "TOOL_ALIAS_REGISTER",
     "executionGrantToken": "gt_123",
     "parameters": {
       "aliasName": "مرتي",
       "contactId": "cnt_ATTACKER_ID"
     }
   }
   ```
4. If Tool Executor only checks `token.isValid()`, it registers the alias to `cnt_ATTACKER_ID`.

#### Remediation
1. **Enforce Cryptographic Parameter Binding in Tool Executor:** The executor or API Gateway MUST reconstruct the canonical parameter string and assert exact equality with `authGrant.actionHash`:
   ```typescript
   export function verifyToolExecutionBinding(
     toolName: string,
     parameters: unknown,
     token: ExecutionAuthToken
   ): void {
     const computedHash = crypto
       .createHash('sha256')
       .update(canonicalize({ tool: toolName, params: parameters }))
       .digest('hex');
     if (computedHash !== token.actionHash) {
       throw new SecurityTamperingError('Execution parameters do not match signed authorization grant hash.');
     }
   }
   ```
2. **Alternative (Stateless Token Payload):** Encrypt the canonical parameters directly inside the signed token, requiring no parameters to be passed in the HTTP body of `POST /v1/tools/execute`.

#### Verification Plan
Author test `test_tool_executor_aborts_on_parameter_mismatch()` asserting that modifying any parameter in the payload while retaining a valid token triggers an immediate `403 Forbidden / SecurityTamperingError` and logs a critical security alert.

---

### Finding SEC-P1-01: Life-Safety Failure — Emergency Workflow Dependent on Cloud API Gateway and Remote Network Availability
- **Severity:** `P1` (Critical Security Boundary / Life Safety)
- **Status:** Open (Architecture Defect)
- **Affected Files:**
  - `docs/architecture/SYSTEM_ARCHITECTURE.md` (lines 26–60, 91–130)
  - `docs/architecture/CAPABILITY_MATRIX.md` (lines 98–105)
  - `docs/architecture/PERMISSION_MATRIX.md` (line 83)
  - `docs/security/THREAT_MODEL.md` (Section 4, Attack Tree 3)

#### Threat Description
`CAP_EMERGENCY_TRIGGER` is categorized as `Risk Tier: CRITICAL` (Life Safety). However, `SYSTEM_ARCHITECTURE.md` depicts an end-to-end request pipeline where all user utterances are transmitted over TLS 1.3 / WebSocket to the backend modular monolith (`https://api.sanad.local/v1/assistant/interpret` -> `/v1/policy/evaluate`).
In Palestine, blind users face frequent network partitions, checkpoint signal jamming, and rural 2G/3G dead zones. If an emergency occurs while network connectivity is degraded or the server is undergoing maintenance, the assistant will hang on network I/O, fail to resolve the intent, and never trigger the emergency protocol.

#### Reproduction Scenario
1. Mobile device enters an area with no cellular data (airplane mode or zero reception).
2. Blind user in distress triggers the emergency phrase *"طوارئ"* or presses the emergency button.
3. Mobile app attempts `POST https://api.sanad.local/v1/assistant/interpret`.
4. Network timeout occurs after 10–30 seconds.
5. Result: Assistant emits an error earcon or network failure message. The emergency call is never initiated.

#### Remediation
1. **Decouple Emergency from Backend:** Redesign `CAP_EMERGENCY_TRIGGER` as a 100% autonomous, device-local Android native service (`EmergencyNativeModule`).
2. **Local Hardware & Keyword Triggers:** Trigger via hardware buttons (e.g. 5 rapid presses of power button or volume rocker combination) or lightweight on-device keyword spotter (Porcupine / PocketSphinx / Android SpeechRecognizer offline).
3. **Local State Machine:** The 5-second countdown with audible cancellation ("إلغاء") and the subsequent telephony dispatch (`Intent.ACTION_CALL`) must execute strictly on-device without any network calls.
4. Telemetry is queued asynchronously for upload only after the device regains connectivity.

#### Verification Plan
Author automated integration test `test_emergency_trigger_works_completely_offline()` simulating complete network disconnection (`fetch()` throws `NetworkError`) and asserting that native emergency telephony intent is dispatched after countdown.

---

### Finding SEC-P1-02: Reversible Hashing of Phone Numbers in Audit Logs Enabling Mass De-anonymization via Rainbow Tables
- **Severity:** `P1` (Critical Privacy & Data Boundary Failure)
- **Status:** Open (Architecture Defect)
- **Affected Files:**
  - `docs/security/SECURITY_MODEL.md` (lines 116–128)
  - `docs/security/DATA_CLASSIFICATION.md` (lines 62–65)
  - `docs/security/PRIVACY.md` (lines 16–17)

#### Threat Description
`SECURITY_MODEL.md` Section 6 specifies:
`"Phone numbers are hashed using salt + SHA-256 before logging: hash(phone + salt)."`
This is a critical privacy vulnerability. The search space for telephone numbers in Palestine is bounded and minuscule:
- Mobile operators: Jawwal (`+97059...` / `059...`) and Ooredoo (`+97056...` / `056...`).
- Each prefix is followed by exactly 7 decimal digits ($10^7 = 10,000,000$ numbers per operator).
- Total search space is under $20,000,000$ possible phone numbers.
A single consumer GPU (e.g. RTX 4090) computes over 25 billion SHA-256 hashes per second. With a known or extracted salt from database configuration, an adversary can precompute a complete rainbow table of every Palestinian telephone number in under 50 milliseconds.
If an attacker or intelligence agency accesses database backups or audit tables, every contact interaction is instantly de-anonymized.

#### Reproduction Scenario
1. Adversary obtains a database dump of `audit_logs` containing `phone_hash = "8f2b1a3d..."` and salt from server configuration.
2. Adversary runs a 5-line Python script iterating over `0590000000` to `0599999999` and `0560000000` to `0569999999`.
3. Execution time: $< 2$ seconds on a standard laptop.
4. Result: Exact phone number of every caller and recipient is revealed.

#### Remediation
1. **Zero Phone Number Logging:** Never log phone numbers in the audit log, even in hashed form.
2. **Device-Local Sovereignty:** As stated in `PRIVACY.md`, telephone numbers must remain exclusively in the native Android address book. The backend only references opaque internal contact IDs (`cnt_uuid`).
3. Audit log schema must store:
   - `actionType`: `CAP_CONTACT_CALL`
   - `pseudonymizedContactRef`: Hashed internal UUID (`hash(userId + cnt_uuid)`)
   - `status`: `SUCCESS` | `FAILED`
   - Zero telephone digits or reversible hashes.

#### Verification Plan
Author test `test_audit_log_contains_zero_phone_hashes()` running a static schema and payload linter to ensure no column or payload attribute accepts or stores phone hashes.

---

### Finding SEC-P1-03: Client-Mediated State Vulnerability & Confused Deputy Pipeline (Unsigned `StructuredActionCandidate`)
- **Severity:** `P1` (Critical Security Boundary Failure)
- **Status:** Open (Architecture Defect)
- **Affected Files:**
  - `docs/architecture/API_CONTRACTS.md` (lines 23–99)
  - `docs/architecture/COMPONENT_BOUNDARIES.md` (lines 100–134)
  - `docs/architecture/SYSTEM_ARCHITECTURE.md` (lines 26–60)

#### Threat Description
The API contracts establish the following request lifecycle:
1. Client calls `POST /v1/assistant/interpret` with user utterance.
2. Gateway returns `actionCandidate` in plaintext to client.
3. Client creates a new request to `POST /v1/policy/evaluate`, passing `{ "action": actionCandidate, "deviceContext": ... }`.
4. Policy Engine evaluates the action.

This architecture treats the untrusted mobile client as the trusted orchestrator of pipeline state. Because `actionCandidate` is returned in plaintext without an HMAC integrity token:
1. Malicious software on the device or a modified client can bypass `interpret` entirely and directly send arbitrary actions to `POST /v1/policy/evaluate`.
2. The Policy Engine has zero verification that the incoming action originated from the Intent Classifier or reflected actual user speech.
3. Furthermore, `deviceContext.osPermissionsGranted` is self-reported by the client without cryptographic attestation.

#### Reproduction Scenario
1. Attacker writes a script that authenticates as a registered user.
2. Attacker skips `/v1/assistant/interpret` and directly sends crafted actions to `/v1/policy/evaluate` with spoofed `deviceContext: { osPermissionsGranted: ["ALL"] }`.
3. If the user grants consent in settings, the Policy Engine approves the request, unaware that the user never spoke or initiated the command.

#### Remediation
1. **Server-Side Pipeline Orchestration:** In the modular monolith backend, the API Gateway should orchestrate the lifecycle internally:
   `Client Utterance -> Gateway -> Intent Classifier -> Policy Engine -> Gateway Response`.
   The client receives either the direct execution result (for Low risk) or a confirmation challenge (for High/Critical risk).
2. **If Multi-Step API is Maintained:** `POST /v1/assistant/interpret` must return an HMAC-signed `candidateToken` containing `actionCandidate` and an expiration timestamp. `POST /v1/policy/evaluate` must require and verify this `candidateToken`, rejecting any naked action payloads.

#### Verification Plan
Author test `test_policy_engine_rejects_unsigned_action_candidate()` verifying that submitting an unauthenticated or tampered `action` payload directly to `/v1/policy/evaluate` returns `400 Bad Request / 401 Unauthorized`.

---

### Finding SEC-P1-04: Cloud Leakage of Plaintext Contact Names Violating Sovereign Address Book Boundary
- **Severity:** `P1` (Data Boundary & Privacy Violation)
- **Status:** Open (Architecture Defect)
- **Affected Files:**
  - `docs/architecture/API_CONTRACTS.md` (lines 180–220)
  - `docs/security/DATA_CLASSIFICATION.md` (lines 49, 51–52)
  - `docs/security/PRIVACY.md` (lines 16–17)

#### Threat Description
`PRIVACY.md` Section 1 explicitly specifies:
`"Local Address Book Sovereignty: Sanad does not upload the user's phone contacts to the cloud. Contact lookups and alias resolutions occur against local contact IDs or securely hashed internal tokens."`
However, in `API_CONTRACTS.md` Section 6, the response from `GET /v1/contacts/aliases` returns:
```json
{
  "aliases": [
    {
      "id": "als_11223344",
      "alias": "مرتي",
      "contactName": "هدى",
      "createdAt": "2026-09-12T09:00:00Z"
    }
  ]
}
```
And `POST /v1/tools/execute` response returns `contactName: "هدى"`.
This demonstrates that real contact names (PII) are being transmitted to and stored on the backend server. If the server database is breached, the user's personal relationship graph and contacts' identities are exposed.

#### Remediation
1. Remove `contactName` from all backend schemas, database tables, and API responses.
2. The backend Alias Manager must only map `alias` -> `localContactId` (opaque UUID).
3. The mobile client resolves `localContactId` against the native Android contacts provider locally on the device to obtain the display name for TalkBack announcements.

#### Verification Plan
Author test `test_alias_api_returns_zero_contact_real_names()` verifying that the backend database schema for `contact_aliases` contains zero `contact_name` columns and API responses never emit contact names.

---

### Finding SEC-P2-01: Semantic Contact Shadowing & Hijacking via Unconfirmed Alias Registration
- **Severity:** `P2` (Significant Security Weakness / Tool Abuse)
- **Status:** Open (Architecture Defect)
- **Affected Files:**
  - `docs/architecture/CAPABILITY_MATRIX.md` (lines 27, 50–54)
  - `docs/architecture/PERMISSION_MATRIX.md` (line 73)

#### Threat Description
In `CAPABILITY_MATRIX.md`, `CAP_ALIAS_MANAGE` is classified as `Risk Tier: LOW`, with confirmation:
`"Conditional (Only on overwrite/delete)"`.
This means registering a *new* alias requires zero user confirmation.
An attacker (via ambient voice injection or prompt injection via incoming text/SMS) can register an alias for high-stakes terms that do not yet exist, such as:
- "إسعاف" (Ambulance) -> `attacker_contact_id`
- "طوارئ" (Emergency) -> `attacker_contact_id`
- "المحامي" (Lawyer) -> `attacker_contact_id`
- "أبوي" (My Father) -> `attacker_contact_id`
Because the alias did not previously exist, it is not an overwrite, so the system silently creates it. Subsequent voice calls or messages to that alias will be misdirected to the attacker.

#### Remediation
1. Reclassify `CAP_ALIAS_MANAGE` as `MEDIUM` risk.
2. Mandate explicit voice confirmation with read-back for **all** alias operations (creation, modification, deletion).
3. Reserve system keywords ("طوارئ", "إسعاف", "شرطة", "إلغاء", "وقف") in a hardcoded blacklist, preventing them from ever being registered as contact aliases.

#### Verification Plan
Author test `test_alias_creation_requires_mandatory_confirmation()` and `test_system_keywords_blacklisted_from_aliases()`.

---

### Finding SEC-P2-02: Public Spoken Vocalization of Precise Geolocation (`CAP_LOCATION_READ`) without Acoustic Privacy Gate
- **Severity:** `P2` (Significant Security Weakness / Location Leakage)
- **Status:** Open (Architecture Defect)
- **Affected Files:**
  - `docs/architecture/PERMISSION_MATRIX.md` (line 79)
  - `docs/architecture/CAPABILITY_MATRIX.md` (lines 33, 82–89)
  - `docs/security/DATA_CLASSIFICATION.md` (lines 23–26, 48)

#### Threat Description
`PERMISSION_MATRIX.md` classifies `CAP_LOCATION_READ` as `Risk Tier: MEDIUM`, with `Runtime Confirmation Required?: No (Direct response)`.
Precise GPS coordinates are `TIER 4: RESTRICTED` data.
In the Palestinian context, an assistant speaking the user's precise location aloud over the phone's loudspeaker can endanger the user at military checkpoints or in sensitive areas. An ambient phrase or inadvertent query could cause the phone to announce the exact address or coordinates to anyone within earshot.

#### Remediation
1. Require an acoustic privacy check before vocalizing location:
   - If wired or Bluetooth earphones are connected, speech output is permitted.
   - If audio is routed to the device loudspeaker, the assistant must first ask: *"موقعك حساس. هل تريد سماعه عبر السماعة الخارجية؟"* (Your location is sensitive. Do you want to hear it over the loudspeaker?) and require affirmative confirmation.
2. Location output must default to coarse descriptive landmarks rather than GPS coordinates.

#### Verification Plan
Author test `test_location_read_requires_privacy_gate()` verifying that loudspeaker output triggers a confirmation prompt when no headset is detected.

---

### Finding SEC-P2-03: In-Memory Token Replay Tracking Ineffective Under Multi-Process or Server Restart Conditions
- **Severity:** `P2` (Significant Security Weakness / Replay Vulnerability)
- **Status:** Open (Architecture Defect)
- **Affected Files:**
  - `docs/security/SECURITY_MODEL.md` (lines 73–89)
  - `docs/architecture/PERMISSION_MATRIX.md` (lines 160–168)

#### Threat Description
`SECURITY_MODEL.md` specifies that single-use nonces are recorded in an "in-memory replay cache".
If the Fastify backend is deployed across multiple worker processes (Node.js cluster mode) or restarted by a container supervisor, the in-memory cache is lost or partitioned across workers.
A captured `executionGrantToken` could be replayed across workers within its 10-second validity window.

#### Remediation
Store consumed nonces in PostgreSQL using an atomic insert:
```sql
CREATE TABLE consumed_tokens (
  nonce UUID PRIMARY KEY,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
```
Tool execution must perform an atomic `INSERT INTO consumed_tokens ... ON CONFLICT DO NOTHING`. If zero rows are inserted, execution is aborted immediately. Expired nonces are purged via a TTL index or daily cron.

#### Verification Plan
Author test `test_atomic_token_consumption_prevents_concurrent_replay()` verifying that concurrent requests using the same token fail with `TokenAlreadyConsumedError`.

---

### Finding SEC-P2-04: Ambient Acoustic Spoofing & TTS Microphone Bleed in Spoken Confirmation Loop
- **Severity:** `P2` (Significant Security Weakness / Voice Spoofing)
- **Status:** Open (Architecture Defect)
- **Affected Files:**
  - `docs/security/THREAT_MODEL.md` (lines 50–52, 65–75)
  - `docs/architecture/PERMISSION_MATRIX.md` (lines 70–84)

#### Threat Description
High-risk actions require the user to answer "نعم" (Yes) or "لا" (No).
If TTS audio output is playing while the microphone is listening, acoustic bleed can trigger false affirmative confirmations.
Additionally, in crowded public spaces (e.g. buses, markets), a bystander uttering "نعم" within the 30-second confirmation window can authorize a sensitive action without the blind user's intent.

#### Remediation
1. **Microphone Muting During TTS:** Microphone input must be completely disabled while TTS prompts are active, enabling capture only after TTS has finished.
2. **Short Audio Window:** Reduce voice confirmation listening window to 5 seconds.
3. **Multi-Modal Physical Gesture Fallback:** For `HIGH` and `CRITICAL` risk actions, the user should be prompted with a physical confirmation option (e.g. double-tapping volume-up or a specific TalkBack two-finger gesture) as the definitive confirmation signal.

#### Verification Plan
Author client integration test verifying microphone gating during TTS playback and gesture-based confirmation handling.

---

### Finding SEC-P3-01: Clock Skew & Ephemeral Signing Key Invalidation Causing False Denial-of-Service
- **Severity:** `P3` (Normal Security Issue / Operational Robustness)
- **Status:** Open (Architecture Defect)
- **Affected Files:**
  - `docs/security/SECURITY_MODEL.md` (lines 78–88)
  - `docs/architecture/API_CONTRACTS.md` (lines 98, 110, 147)

#### Threat Description
`SECURITY_MODEL.md` specifies hourly rotation of HMAC secrets and strict 10s/30s token expiration.
Without a key rotation grace window, tokens issued in the 59th minute will be rejected when validated in the 0th minute of the next hour.
Additionally, mobile device clock skew relative to the server can cause immediate rejection of legitimate tokens.

#### Remediation
1. Support dual-key verification during rotation: maintain `current_key` and `previous_key` for a 5-minute grace period.
2. Include a 5-second leeway buffer when verifying expiration timestamps.

#### Verification Plan
Author test verifying token validity during key rotation boundary.

---

### Finding SEC-P3-02: Inadequate Rate Limiting Granularity on Voice Interpretation Endpoint
- **Severity:** `P3` (Normal Security Issue / Denial of Service)
- **Status:** Open (Architecture Defect)
- **Affected Files:**
  - `docs/architecture/API_CONTRACTS.md` (lines 23–47)
  - `docs/security/THREAT_MODEL.md` (lines 57–58)

#### Threat Description
The threat model specifies a coarse rate limit of 10 requests/minute per device. This is too restrictive during rapid conversational disambiguation, yet allows an adversary to open multiple sessions or send oversized audio payloads that exhaust backend SLM memory.

#### Remediation
Implement tiered leaky-bucket rate limiting:
- Burst allowance: up to 5 requests in 10 seconds.
- Sustained rate: 20 requests per minute per authenticated device.
- Hard payload caps: max 256 characters for transcribed text; max 10 seconds / 160KB for voice audio buffers.

#### Verification Plan
Author test `test_rate_limiter_throttles_excess()` verifying burst and sustained limits.

---

## 4. Remediation Roadmap & Architecture Gates for Phase 3

To ensure a seamless transition from Phase 2 to Phase 3 MVP development, the responsible engineering agents must implement the following fixes in the architecture baseline before implementing capability code:

```text
+-----------------------------------------------------------------------------------------------+
| PHASE 3 PRE-IMPLEMENTATION SECURITY GATES                                                     |
+-----------------------------------------------------------------------------------------------+
| Gate 1 [P0 Fixed]: Server-side authoritative confirmation lookup implemented in policy engine  |
| Gate 2 [P0 Fixed]: Tool parameter HMAC hash binding verified by Tool Executors                |
| Gate 3 [P1 Fixed]: Emergency workflow decoupled to autonomous offline native Android daemon   |
| Gate 4 [P1 Fixed]: Phone number hashing removed from audit specs; zero phone storage enforced |
| Gate 5 [P1 Fixed]: Plaintext contact names eliminated from API schemas & backend persistence  |
| Gate 6 [P1 Fixed]: Server-side orchestration or candidate HMAC token enforced                 |
| Gate 7 [P2 Fixed]: Alias creation reclassified to mandatory explicit confirmation + blacklist  |
+-----------------------------------------------------------------------------------------------+
```

---

## 5. Security Engineer Sign-off & Status

- **Review Outcome:** Architecture reviewed with findings documented.
- **Implementation Status:** Gated pending resolution of P0/P1 items by Solution Architect and Backend/Mobile Leads.
- **Verification Suites:** Security test assertions authored in `testing/security/` to validate all findings once remediated.
