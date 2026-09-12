# Sanad Security Architecture & Model

**Document Version:** 1.2.0  
**Status:** Approved Baseline (Updated Post ADR-004, ADR-005, ADR-006)  
**Classification:** Security Architecture Specification  
**Security Lead / Author:** Sanad Security Engineer  

---

## 1. Foundational Security Principles

Sanad is designed for blind and visually impaired users who interact with the physical and digital world primarily through audio. Because these users cannot visually inspect screens to catch erroneous or malicious actions, system integrity is a life-safety requirement.

The security model is founded on six uncompromising axioms:

1. **AI is an Untrusted Interpretation Layer:** Generative models, Large Language Models (LLMs), and Small Language Models (SLMs) are probabilistic and susceptible to hallucinations, jailbreaks, and prompt injection. Their outputs are classified as **untrusted user input** and must never directly invoke system APIs.
2. **Deterministic Security Kernel:** All authorization, permission evaluation, and risk decisions are executed by a **deterministic, rule-based Policy Engine**. The security kernel contains zero probabilistic algorithms, zero neural networks, and zero external network calls.
3. **Cryptographically Sealed Pipeline (ADR-006):**
   $$\text{User Utterance} \longrightarrow \text{Intent Classifier} \xrightarrow[\text{Signed } \text{act\_}]{\text{Candidate Token}} \text{Policy Engine} \xrightarrow[\text{Single-Use } \text{ct\_ / gt\_}]{\text{Authorization Grants}} \text{Tool Executor} \longrightarrow \text{Audit Log}$$
4. **Deny-by-Default & Authoritative Confirmation (ADR-004):** Every action is forbidden unless explicitly authorized by active capability flags, explicit user consent, OS permissions, and valid confirmation tokens. Confirmation requirements are determined strictly by server-side policy, completely ignoring client- or AI-provided metadata.
5. **Cryptographic Tool Parameter Binding (ADR-004):** Tool executors strictly assert that runtime parameters match the SHA-256 canonical parameter hash bound within the execution grant token before executing any side effects.
6. **Data Minimization & Sovereign Privacy (ADR-006):** Ephemeral data (audio recordings, real-time GPS coordinates, SMS contents) are destroyed immediately after consumption. **Zero Phone Storage Invariant:** Under no circumstances are raw phone numbers, masked telephone strings, or salted hashes persisted in backend databases or audit logs.

---

## 2. Threat Boundary & Isolation Architecture

```text
+====================================================================================================+
|                                     UNTRUSTED ZONE (Perimeter)                                     |
|                                                                                                    |
|  - Spoken Audio / Background Noise                                                                 |
|  - Raw User Utterance Text                                                                         |
|  - External Content (Incoming SMS, Calendar invites, Web geocoding)                                |
+==================================================+=================================================+
                                                   |
                                                   v
+====================================================================================================+
|                              GENERATIVE / INTERPRETATION ZONE                                      |
|                                                                                                    |
|  - Arabic Dialect Normalizer                                                                       |
|  - Intent Parser (SLM / Local LLM / Regex Matcher)                                                 |
|                                                                                                    |
|  OUTPUT: StructuredActionCandidate JSON + Cryptographically Signed CandidateToken (act_...)        |
|  RESTRICTION: Has NO capability to execute tools, read private files, or authorize actions         |
+==================================================+=================================================+
                                                   | Strict Zod Schema Gate + act_ Token
                                                   v
+====================================================================================================+
|                                DETERMINISTIC SECURITY KERNEL                                       |
|                                                                                                    |
|  - Candidate Token Signature & Action Hash Verifier (Confused Deputy Prevention)                   |
|  - Authoritative Server-Side Confirmation Matrix (ADR-004)                                         |
|  - Deterministic RBAC / ABAC / Risk Classification                                                 |
|  - Confirmation Challenge Generator (HMAC-SHA256 ct_ Token)                                        |
|  - Anti-Replay Nonce Verification (Single-Use Ledger)                                              |
|                                                                                                    |
|  OUTPUT: Ephemeral ExecutionGrantToken (gt_...) binding actionHash                                 |
+==================================================+=================================================+
                                                   | Valid Cryptographic Grant + Tamper Proof Hash
                                                   v
+====================================================================================================+
|                                   BOUNDED EXECUTION ZONE                                           |
|                                                                                                    |
|  - Parameter Hash Assertion: SHA-256(capability + ":" + canonical(params)) == token.actionHash    |
|  - Bounded Tool Executors (Stateless Adapters)                                                     |
|  - Capability Gates (Static Feature Flags / Kill Switches)                                         |
|  - OS API Drivers (Android Native APIs)                                                            |
+====================================================================================================+
```

---

## 3. Three-Phase Cryptographic Token Architecture

To ensure end-to-end authorization integrity, prevent Confused Deputy attacks, and eliminate parameter substitution, Sanad implements a three-phase cryptographic token protocol:

### Phase 0: Action Candidate Token (`act_...`) [Governed by ADR-006]
When the Intent Classifier extracts a structured action:
1. It computes:
   $$\text{candidateHash} = \text{SHA-256}(\text{intentId} + \text{":"} + \text{canonicalizeJson}(\text{slots}))$$
2. Constructs a signed payload:
   $$\text{Payload} = \{\text{type}: \text{"CANDIDATE\_TOKEN"}, \text{intentId}, \text{targetCapability}, \text{candidateHash}, \text{nonce}, \text{issuedAt}, \text{expiresAt}\}$$
3. Signs the payload using `HMAC-SHA256` with the server cluster secret key (`act_<encodedPayload>.<signature>`).
4. Token expires deterministically in **60 seconds**.
5. `POST /v1/policy/evaluate` mandates this token and verifies that `candidateHash` exactly matches the incoming `action.slots`. Naked or client-forged actions are rejected with `401 Unauthorized`.

### Phase 1: Confirmation Challenge Token (`ct_...`) [Governed by ADR-004]
When the Policy Engine evaluates an action requiring confirmation:
1. Computes canonical parameter hash:
   $$\text{actionHash} = \text{SHA-256}(\text{targetCapability} + \text{":"} + \text{canonicalizeJson}(\text{parameters}))$$
2. Constructs payload:
   $$\text{Payload} = \{\text{type}: \text{"CONFIRMATION\_TOKEN"}, \text{actionId}, \text{userId}, \text{targetCapability}, \text{actionHash}, \text{nonce}, \text{issuedAt}, \text{expiresAt}\}$$
3. Signs payload with `HMAC-SHA256`. Token expires in **30 seconds**.
4. Emits `confirmationToken` to client alongside spoken Arabic confirmation challenge text.

### Phase 2: Execution Grant Token (`gt_...`) [Governed by ADR-004]
Upon affirmative confirmation (or for direct `ALLOWED` low-risk actions):
1. Verifies `ct_...` signature, checks expiration, and consumes nonce in anti-replay ledger.
2. Emits single-use `executionGrantToken` carrying `actionHash`, `toolName`, `targetCapability`, and a **10-second TTL**.
3. **Mandatory Executor Hash Assertion:** Prior to executing any side effect, the Tool Executor evaluates:
   ```typescript
   const computedHash = computeActionHash(targetCapability, parameters);
   if (computedHash !== authGrant.actionHash) {
     throw new TamperedParametersError("Runtime parameters do not match signed authorization grant.");
   }
   ```

---

## 4. Prompt Injection & Jailbreak Defense

Generative AI components in Sanad are isolated behind structural firewalls to prevent prompt injection:

1. **Zero System Instruction Leaks:** The intent parser is given a strict extraction prompt with no administrative or policy instructions that could be overridden.
2. **Schema Enforcement:** The output of the AI layer is passed through a strict Zod parser with `.strict()`. Any injected fields, markdown formatting, or unexpected keys cause an immediate validation crash, returning `INTENT_UNRECOGNIZED`.
3. **Indirect Injection Immunity:** External untrusted text (e.g. incoming SMS content, calendar descriptions) is treated strictly as inert string arguments, never concatenated into prompt templates.
4. **Deterministic Intent Fallback:** High-risk keywords (e.g., "طوارئ", "إلغاء", "وقف") are intercepted by deterministic regex before reaching any language model.

---

## 5. Mobile Device Security & Autonomous Emergency Architecture

The React Native mobile client adheres to Android enterprise security guidelines and life-safety requirements:

1. **Android KeyStore Vault:** Cryptographic keys (session tokens, alias encryption keys) are generated inside the Android hardware-backed KeyStore (`KeyGenParameterSpec.Builder(..., PURPOSE_ENCRYPT | PURPOSE_DECRYPT)`).
2. **EncryptedSharedPreferences:** All local user preferences are encrypted using AES-256-GCM.
3. **Autonomous Native Emergency Daemon (ADR-005):**
   - `CAP_EMERGENCY_TRIGGER` is decoupled from cloud infrastructure and remote network connectivity.
   - Operates 100% on-device via native Android Kotlin daemon.
   - Activates via hardware button sequences (e.g. 5 rapid power presses) or offline on-device keyword recognition.
   - Executes a 5-second countdown with distinctive audible earcons and speech cancellation ("إلغاء"), culminating in native telephony dispatch (`Intent.ACTION_CALL`).
4. **Screen Curtain & Privacy Mode:** Allows blind users to turn off the physical screen backlight during interactions, preventing shoulder-surfing in public environments.
5. **Tamper Detection:** The client verifies package signatures and flags execution on rooted devices or active debuggers.

---

## 6. Audit Logging & Sovereign Privacy (Zero-Phone Invariant)

To guarantee non-repudiation and complete sovereignty under heightened physical and surveillance risks:

1. **Append-Only Storage:** Audit logs are written to an isolated PostgreSQL table with insert-only permissions granted to the application service role.
2. **Zero-Phone Storage Invariant (ADR-006):**
   - **Absolute Prohibition:** Storing telephone numbers, masked telephone numbers, or salted phone hashes in audit databases is strictly forbidden.
   - *Rationale:* Because Palestinian mobile phone numbers span a small entropy space ($\le 2 \times 10^7$ numbers), salted SHA-256 hashes can be cracked in milliseconds via rainbow tables.
   - Audit records store only opaque, client-generated pseudonymous contact identifiers (`cnt_550e8400-e29b-41d4-a716-446655440000`).
3. **Zero Precise Geolocation:** GPS coordinates are never persisted. Only coarse regional descriptors (`ar-PS-WB`) are recorded.
4. **Message Minimization:** Raw message text is omitted; only message length and non-reversible content hash are recorded.
5. **Standard Audit Fields:**
   - `eventId`: UUIDv4
   - `timestamp`: UTC ISO8601
   - `userId`: Pseudonymized user identifier
   - `requestedCapability`: e.g., `CAP_ALIAS_MANAGE`
   - `policyDecision`: `ALLOWED` | `CONFIRMATION_REQUIRED` | `DENIED`
   - `reasonCode`: Deterministic policy reason code (e.g., `POL_ALLOW_VERIFIED_GRANT`)
   - `executionStatus`: `SUCCESS` | `FAILED` | `ABORTED`
