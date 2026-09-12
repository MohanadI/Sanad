# Sanad Threat Model & Attack Surface Analysis

**Document Version:** 1.1.0  
**Status:** Architecture Security Review Update (Phase 2)  
**Classification:** Security Architecture Specification  
**Methodology:** STRIDE + AI-Specific Threat Modeling (OWASP Top 10 for LLM & Assistive Technology)  
**Security Lead / Author:** Sanad Security Engineer  

---

## 1. Scope & System Boundary

This threat model evaluates the end-to-end security architecture of the Sanad accessibility platform prior to Phase 3 MVP implementation:
1. **Client Edge:** Android-first React Native mobile client, TalkBack accessibility node tree, native audio capture/playback, and Android KeyStore.
2. **Transport Boundary:** TLS 1.3 WebSocket and HTTPS channels between device and API Gateway.
3. **AI / NLP Interpretation Boundary:** Dialect normalizer, regex fast-paths, and local/free SLM intent classifier (**Untrusted Generative Boundary**).
4. **Deterministic Security Kernel:** Policy Engine (RBAC, ABAC, risk classification, confirmation token signer, single-use nonce tracker) (**Security Boundary**).
5. **Bounded Tool Execution Boundary:** Tool executors and OS native bridges (**Execution Boundary**).
6. **Data & Audit Boundary:** PostgreSQL 16 append-only audit trail and encrypted local/remote preferences.

```text
+========================================================================================+
|                                    TRUST BOUNDARY 0                                    |
| [Physical & Ambient Environment: Checkpoints, Public Street, Acoustic Eavesdroppers]   |
+===========================================+============================================+
                                            | Audio / Physical Device
                                            v
+========================================================================================+
|                        TRUST BOUNDARY 1: MOBILE CLIENT APPLICATION                     |
|                                                                                        |
|  - TalkBack Accessibility Bridge          - Android KeyStore (AES-256-GCM Vault)       |
|  - SoundPool Native Earcon Engine         - Native Emergency Autonomous Daemon (Local) |
+===========================================+============================================+
                                            | TLS 1.3 + Device JWT
                                            v
+========================================================================================+
|                        TRUST BOUNDARY 2: BACKEND API GATEWAY                           |
|                                                                                        |
|  - Fastify Transport Layer                - Strict Ingress Schema Validator (Zod)      |
|  - Tiered Token & IP Rate Limiter         - Session & Nonce Verifier                   |
+===========================================+============================================+
                                            |
                                            v
+========================================================================================+
|              TRUST BOUNDARY 3: INTENT CLASSIFIER [UNTRUSTED GENERATIVE ZONE]           |
|                                                                                        |
|  - Dialect Normalizer (ar-PS)             - Rule-Based Fast Path Regex                 |
|  - Small Language Model (SLM) Fallback    - JSON Schema Emission Guard                 |
+===========================================+============================================+
                                            | StructuredActionCandidate (Untrusted DTO)
                                            v
+========================================================================================+
|              TRUST BOUNDARY 4: DETERMINISTIC POLICY ENGINE [SECURITY KERNEL]          |
|                                                                                        |
|  - Immutable Capability Matrix            - Confirmation State Machine                 |
|  - Role / Permission Evaluator            - HMAC-SHA256 Token Signer (ct_ / gt_)       |
|  - Zero Neural / ML Logic                 - Single-Use Nonce Ledger                    |
+===========================================+============================================+
                                            | Authorized Grant Token (gt_...)
                                            v
+========================================================================================+
|                   TRUST BOUNDARY 5: BOUNDED TOOL EXECUTORS [EXECUTION ZONE]            |
|                                                                                        |
|  - Stateless Bounded Adapters             - Canonical Parameter Hash Verifier          |
|  - Static Feature Flags (Kill Switches)   - Ephemeral Memory Buffers (Zero Leakage)    |
+========================================================================================+
```

---

## 2. Threat Actors & Attacker Profiles

| Attacker Profile | Motivation | Capabilities | Attack Vectors |
|---|---|---|---|
| **Ambient / Social Adversary** | Impersonation, unauthorized confirmation, harassment | Nearby speech, public acoustics, speakerphones | Speaking "نعم" (Yes) during active confirmation windows; acoustic prompt injection. |
| **Adversarial Prompt Injector** | Jailbreaking AI, manipulating tool parameters | Crafted audio, injected text via incoming SMS, malicious calendar invites | Indirect prompt injection, structured-output poisoning, payload smuggling. |
| **Checkpoint / Physical Inspector** | Geolocation extraction, contact graph surveillance | Physical custody of device, coercion, forensic imaging | Extracting cached locations, inspecting local SQLite databases, dumping unencrypted logs. |
| **Surveillance / Network Adversary** | Social mapping, tracking movement | ISP traffic interception, rogue cellular towers, Wi-Fi sniffing | MitM attacks, traffic correlation, DNS poisoning, audit log exfiltration. |
| **Malicious On-Device App** | Tool abuse, credential exfiltration | Android background app with standard user permissions | IPC tampering, accessibility service scraping, intent sniffing, clipboard interception. |
| **Infrastructure / Database Intruder** | Mass surveillance, identity harvesting | Read access to backend database dumps or backups | Rainbow table cracking of hashed phone numbers, exfiltrating contact graphs. |

---

## 3. Comprehensive STRIDE Threat Analysis

### 3.1. Spoofing (Identity & Authenticity)

| Threat ID | Threat Description | Affected Component | Impact | Likelihood | Architectural Countermeasure | Verification Assertion |
|---|---|---|---|---|---|---|
| **STRIDE-S1** | Background bystander speaks "نعم" (Yes) during high-risk confirmation loop. | Mobile Client / Audio Engine | **High** | Medium | Dual-modality confirmation: acoustic timeout (5s) + mandatory TalkBack/haptic physical gesture for High/Critical actions. | `test_confirmation_rejects_ambient_speech_without_gesture()` |
| **STRIDE-S2** | Attacker crafts forged `executionGrantToken` to trigger tool execution. | Tool Executor / Policy Engine | **Critical** | Low | HMAC-SHA256 signature verification using server secret rotated with overlapping grace periods + persistent single-use nonce ledger. | `test_reject_forged_or_tampered_execution_token()` |
| **STRIDE-S3** | Rogue client impersonates valid device to flood backend. | API Gateway | **Medium** | Medium | Hardware-backed device token authentication stored in Android KeyStore + tiered rate limiting. | `test_gateway_rejects_unauthenticated_device()` |

### 3.2. Tampering (Integrity)

| Threat ID | Threat Description | Affected Component | Impact | Likelihood | Architectural Countermeasure | Verification Assertion |
|---|---|---|---|---|---|---|
| **STRIDE-T1** | **Parameter Tampering:** Client substitutes parameters in `POST /v1/tools/execute` while presenting a valid `executionGrantToken` from another action. | API Gateway / Tool Executor | **Critical** | High | Tool Executor strictly recalculates `SHA-256(canonical(toolName + params))` and asserts exact match against `token.actionHash`. | `test_tool_executor_aborts_on_parameter_mismatch()` |
| **STRIDE-T2** | Client-mediated state tampering: Client modifies `StructuredActionCandidate` returned by `interpret` before sending to `evaluate`. | API Gateway / Policy Engine | **High** | High | Server-side pipeline orchestration: `interpret` issues an HMAC-signed candidate token, or evaluation occurs in a single atomic server session. | `test_policy_engine_rejects_unsigned_action_candidate()` |
| **STRIDE-T3** | Modification of local contact alias database by malicious local app. | Mobile Storage | **High** | Low | SQLCipher database encryption with 256-bit key generated and stored exclusively in Android KeyStore. | `test_local_alias_db_encrypted_at_rest()` |

### 3.3. Repudiation

| Threat ID | Threat Description | Affected Component | Impact | Likelihood | Architectural Countermeasure | Verification Assertion |
|---|---|---|---|---|---|---|
| **STRIDE-R1** | User or caregiver claims an automated call or message was dispatched without user consent. | Audit Log Subsystem | **Medium** | Low | Cryptographically sealed, append-only PostgreSQL audit table recording intent hash, policy decision code, confirmation method, and nonce. | `test_audit_trail_non_repudiation_record()` |

### 3.4. Information Disclosure (Confidentiality & Privacy)

| Threat ID | Threat Description | Affected Component | Impact | Likelihood | Architectural Countermeasure | Verification Assertion |
|---|---|---|---|---|---|---|
| **STRIDE-I1** | **Phone Rainbow Table:** Adversary cracks `SHA-256(phone + salt)` in audit log to de-anonymize all user contacts. | Audit Log / Database | **Critical** | High | **Zero Phone Logging:** Phone numbers are strictly forbidden in backend storage. Logs record only ephemeral random session IDs and capability enums. | `test_audit_log_contains_zero_phone_hashes()` |
| **STRIDE-I2** | Checkpoint inspector extracts GPS coordinates from device storage. | Mobile Storage / Cache | **Critical** | Medium | Ephemeral RAM-only location processing: coordinates zeroed out immediately post reverse-geocoding. Emergency purge clears cache. | `test_zero_gps_artifacts_in_device_storage()` |
| **STRIDE-I3** | Plaintext contact names leaked via `GET /v1/contacts/aliases` endpoint. | Contact Alias Manager | **High** | High | Contact names remain strictly local to device address book. Backend stores only pseudonymized internal UUIDs (`cnt_...`). | `test_alias_api_returns_zero_contact_real_names()` |
| **STRIDE-I4** | Spoken output leaks user's exact street address in public via `CAP_LOCATION_READ`. | Mobile Audio / Presentation | **High** | Medium | Location read-back requires audio output privacy check (earphone detection or explicit spoken prompt confirmation before vocalizing). | `test_location_read_requires_privacy_gate()` |

### 3.5. Denial of Service (Availability)

| Threat ID | Threat Description | Affected Component | Impact | Likelihood | Architectural Countermeasure | Verification Assertion |
|---|---|---|---|---|---|---|
| **STRIDE-D1** | **Emergency Outage:** Network partition or backend crash renders emergency call workflow inoperable. | Mobile Client / Emergency Subsystem | **Critical** | High | **Autonomous Local Daemon:** `CAP_EMERGENCY_TRIGGER` is decoupled from backend; executes directly on-device via native Android telephony. | `test_emergency_trigger_works_completely_offline()` |
| **STRIDE-D2** | Continuous audio streaming exhausts battery and cellular bandwidth. | Mobile Audio Layer | **Medium** | Medium | Client-side Voice Activity Detection (VAD) hard cap: audio recording terminates after 2.5s silence or max 10s total duration. | `test_vad_enforces_audio_caps()` |
| **STRIDE-D3** | API Gateway bombarded with synthesized NLP interpretation requests. | API Gateway | **High** | Medium | Leaky-bucket rate limiting (max 15 req/min per device, max 60 req/min per IP) + strict payload size limit (max 256 bytes text). | `test_rate_limiter_rejects_burst_traffic()` |

### 3.6. Elevation of Privilege (Authorization Bypass)

| Threat ID | Threat Description | Affected Component | Impact | Likelihood | Architectural Countermeasure | Verification Assertion |
|---|---|---|---|---|---|---|
| **STRIDE-E1** | **Confirmation Suppression:** `action.requiresConfirmation` set to `false` in `MEDIUM` risk actions (e.g. `CAP_CALENDAR_WRITE`). | Policy Engine Kernel | **Critical** | High | Policy Engine uses authoritative, immutable server-side lookup `CAPABILITY_CONFIRMATION_POLICY[capability]` ignoring action claims. | `test_policy_engine_overrides_client_confirmation_flag()` |
| **STRIDE-E2** | **Contact Shadowing / Hijacking:** Attacker creates a new alias for "طوارئ" or "أمي" pointing to malicious number without confirmation. | Alias Manager / Policy Engine | **High** | High | All alias creation, modification, and deletion operations mandate explicit audio confirmation before persistence. | `test_alias_creation_requires_mandatory_confirmation()` |
| **STRIDE-E3** | Direct prompt injection overrides Policy Engine via system prompt hijacking. | Intent Classifier | **Critical** | Low | **Physical Architecture Separation:** AI layer has zero imports, zero tokens, and zero access to tool executors. Only Policy Engine issues tokens. | `test_prompt_injection_emits_unauthorized_action_fails_policy()` |

---

## 4. Deep-Dive Attack Trees

### Attack Tree 1: Parameter Tampering / Action Substitution
```text
[Goal: Execute Unauthorized Sensitive Action with Forged Parameters]
  │
  ├── 1. Exploit Client-Mediated Architecture
  │     ├── Submit benign query -> Receive valid executionGrantToken
  │     └── Call /v1/tools/execute with valid token BUT altered parameters
  │           ├── VULNERABILITY: Tool Executor only checks signature, not hash(params)
  │           └── MITIGATION: Tool Executor strictly validates SHA-256(canonical(params)) == token.actionHash
  │
  └── 2. Exploit Confirmation Challenge
        ├── Obtain confirmationToken for benign contact "أحمد"
        ├── Answer affirmative to /v1/policy/confirm
        └── Switch parameters during /v1/tools/execute to target victim phone number
              └── MITIGATION: Token binds actionHash through entire confirmation lifecycle
```

### Attack Tree 2: Semantic Contact Shadowing / Hijacking
```text
[Goal: Redirect Calls or Messages to Attacker-Controlled Number]
  │
  ├── 1. Exploiting "Overwrite-Only" Confirmation Policy
  │     ├── Adversary injects utterance: "سجل رقم 059XXXXXXX باسم الإسعاف"
  │     ├── System checks if "الإسعاف" exists -> Not found (New Alias)
  │     ├── VULNERABILITY: Policy Engine treats new alias as LOW risk (no confirmation)
  │     └── Result: Malicious contact silently registered
  │
  └── MITIGATION:
        └── All alias additions, updates, and removals mandate EXPLICIT confirmation with spoken read-back
```

### Attack Tree 3: Offline Emergency Denial-of-Service
```text
[Goal: Induce Life-Safety Failure by Blocking Emergency Trigger]
  │
  ├── 1. Network Disruption
  │     ├── Checkpoint jammer, rural 2G degradation, or cellular data exhaustion
  │     ├── User utters "طوارئ" (Emergency)
  │     ├── VULNERABILITY: Assistant attempts POST to remote /v1/assistant/interpret
  │     └── Result: Request times out; call fails to initiate
  │
  └── MITIGATION:
        ├── Autonomous local Android Emergency Service with native keyword recognizer
        └── Direct native intent dispatch (Intent.ACTION_CALL) bypassing all cloud infrastructure
```

---

## 5. Security Invariants & Automated Quality Gates

Before any Phase 3 implementation code is merged into `main`, the following automated security gates are mandatory:

1. **Gate 1: Static Import Isolation (Zero AI-Tool Coupling):**
   `depcruise` verifies that `backend/packages/intent-classifier` has 0 references to `policy-engine` or `tool-executors`.
2. **Gate 2: Authoritative Confirmation Integrity:**
   100% of capabilities classified as `MEDIUM`, `HIGH`, or `CRITICAL` must trigger `CONFIRMATION_REQUIRED` regardless of any payload metadata.
3. **Gate 3: Parameter Hash Verification:**
   Tool executors must throw `TamperedParametersError` if `SHA-256(canonical(params)) !== token.actionHash`.
4. **Gate 4: Zero Phone Numbers in Storage:**
   Automated regex scanner asserts 0 occurrences of Palestinian telephone patterns (`05\d{8}`, `\+970\d{9}`, `\+972\d{9}`) in PostgreSQL migrations, schemas, or test logs.
5. **Gate 5: Offline Emergency Resilience:**
   Mobile client integration test verifies that `EmergencyModule.trigger()` executes native dialing when `isOffline === true`.
