# Sanad System Architecture

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Classification:** Internal Technical Architecture  
**Target Audience:** Solution Architects, Engineers, Security Reviewers  

---

## 1. Executive Overview & Mission

**Sanad (سند)** is an Arabic-first assistive accessibility platform designed specifically for blind and visually impaired Palestinian users. The platform allows users to interact naturally with mobile and digital services using Palestinian conversational Arabic, eliminating the barriers imposed by visually dependent graphical interfaces.

The architecture is governed by a fundamental, non-negotiable security axiom:

> **The AI may interpret speech and propose an action, but only the deterministic Policy Engine may authorize it, and only a bounded Tool Executor may execute it.**

Under no circumstances is an Artificial Intelligence model (LLM, SLM, or heuristic classifier) granted direct execution permissions or direct access to device hardware, operating system APIs, or external network services.

---

## 2. Core Security & Execution Pipeline

The entire system is architected around a strictly decoupled, unidirectional execution pipeline:

```text
┌──────────────┐
│  Blind User  │ (Voice / TalkBack Interaction in Palestinian Arabic)
└──────┬───────┘
       │  1. Audio / Text Stream
       ▼
┌─────────────────────────┐
│ Client Accessibility    │ (React Native + TalkBack + Earcons)
│ & Presentation Layer    │
└──────┬──────────────────┘
       │  2. Utterance + Context Metadata
       ▼
┌─────────────────────────┐
│ AI & Arabic Intent      │ (Dialect Normalizer + Intent Parser)
│ Classifier Runtime      │ [UNTRUSTED GENERATIVE BOUNDARY]
└──────┬──────────────────┘
       │  3. Strictly Typed Structured Action (JSON)
       ▼
┌─────────────────────────┐
│ Deterministic Policy    │ (Rules, Role/Grant Checks, Risk Assessment,
│ Engine Kernel           │  Confirmation State Machine) [SECURITY BOUNDARY]
└──────┬──────────────────┘
       │  4. Deterministic Authorization Token (Single-Use, Time-Bound)
       ▼
┌─────────────────────────┐
│ Bounded Tool Executor   │ (Sandboxed, Least-Privilege Native & API Adapters)
│ Layer                   │ [EXECUTION BOUNDARY]
└──────┬──────────────────┘
       │  5. Execution Result + Telemetry
       ▼
┌─────────────────────────┐
│ Append-Only Audit Log   │ (Tamper-evident, zero-raw PII persistence)
│ & Audio Feedback Engine │
└─────────────────────────┘
```

### Pipeline Guarantees
1. **Isolated Generative Boundary:** The output of the AI layer is classified as **untrusted user input**. It is structurally validated against strict JSON schemas before being passed downstream.
2. **Deterministic Security Kernel:** The Policy Engine contains zero machine learning models, zero probabilistic heuristics, and zero external network calls. Its logic is 100% deterministic, inspectable, and unit-testable.
3. **Explicit Confirmation Loop:** For actions classified as Medium, High, or Critical risk, the Policy Engine halts execution, generates a cryptographically signed confirmation token, and instructs the client to obtain explicit audio/haptic user confirmation.
4. **Least-Privilege Tool Execution:** Tool executors are stateless, bounded routines that verify the cryptographic authorization token before interacting with device or operating system APIs.

---

## 3. High-Level Component Topology

Sanad is structured as a **Modular Monolith** backend supporting an **Android-first React Native mobile client**.

```text
                               +-------------------------------------------------------------+
                               |                 SANAD CLIENT (Android / RN)                 |
                               |                                                             |
                               |  +---------------------+       +-------------------------+  |
                               |  | TalkBack A11y Engine|       | Android Audio/STT Engine|  |
                               |  +----------+----------+       +------------+------------+  |
                               |             |                               |               |
                               |             v                               v               |
                               |  +-------------------------------------------------------+  |
                               |  |             Client Orchestration Layer                |  |
                               |  |  - Session Manager          - Local KeyStore Vault    |  |
                               |  |  - Audio Cue Generator      - Offline Action Queue    |  |
                               |  +--------------------------+----------------------------+  |
                               +-----------------------------|-------------------------------+
                                                             | TLS 1.3 / WebSocket + HTTPS
                                                             v
+--------------------------------------------------------------------------------------------+
|                         SANAD BACKEND PLATFORM (Modular Monolith)                          |
|                                                                                            |
|  +--------------------------------------------------------------------------------------+  |
|  | API Gateway & Transport Layer (Fastify / TypeScript)                                 |  |
|  | - TLS Termination     - Device Auth (mTLS/JWT)    - Rate Limiting    - Schema Guard  |  |
|  +-------------------------------------------+------------------------------------------+  |
|                                              |                                             |
|         +------------------------------------+-----------------------------------+         |
|         |                                                                        |         |
|         v                                                                        v         |
|  +--------------------------------+                             +-----------------------+  |
|  | Intent Classification Package  |                             | Contact Alias Manager |  |
|  | - Palestinian Dialect Filter   |                             | - Kinship Resolver    |  |
|  | - Rule-Based Fast Path Regex   |                             | - Local Nicknames     |  |
|  | - Free/Local SLM Fallback      |                             +-----------+-----------+  |
|  +----------------+---------------+                                         |              |
|                   | Emits Structured Action                                 | Resolves IDs |
|                   v                                                         v              |
|  +--------------------------------------------------------------------------------------+  |
|  | Policy Engine Kernel (Core Security Domain)                                          |  |
|  | - Deterministic RBAC/ABAC Validator            - Confirmation Token Signer (HMAC)    |  |
|  | - Risk Assessment Engine (Low/Med/High)        - Anti-Replay & Expiration Monitor    |  |
|  +-------------------------------------------+------------------------------------------+  |
|                                              |                                             |
|                                              | Authorized Action + Valid Token             |
|                                              v                                             |
|  +--------------------------------------------------------------------------------------+  |
|  | Bounded Tool Execution Layer                                                         |  |
|  | - System Status Tool        - Contact Lookup Tool     - Assistant Query Tool         |  |
|  | [GATED: Telephony Tool]     [GATED: Messaging Tool]   [GATED: Calendar Tool]         |  |
|  +-------------------------------------------+------------------------------------------+  |
|                                              |                                             |
|                                              v                                             |
|  +--------------------------------------------------------------------------------------+  |
|  | Persistence, Audit & Storage Layer (PostgreSQL 16)                                   |  |
|  | - Append-Only Audit Trail    - Encrypted User Settings   - Metric Aggregations       |  |
|  +--------------------------------------------------------------------------------------+  |
+--------------------------------------------------------------------------------------------+
```

---

## 4. Component Deep Dive

### 4.1. Mobile Application (Client Layer)
- **Framework:** React Native 0.74+ targeting Android (minSdkVersion 26, Android 8.0+).
- **Accessibility Integration:**
  - Full TalkBack compatibility via native Android accessibility node trees (`accessibilityRole`, `accessibilityState`, `accessibilityLiveRegion`).
  - High-fidelity audio cue system (distinct auditory non-speech icons / "earcons" for listening, processing, confirming, success, error).
  - Screen curtain mode (allows blind users to blank the display to preserve battery and maintain privacy in public).
- **Autonomous Emergency Subsystem (ADR-005):**
  - Features an autonomous Android Kotlin native module (`EmergencyNativeModule`) that operates with **zero cloud dependency**.
  - Initiates emergency protocols via physical hardware button patterns or offline keyword recognition.
  - Enforces a 5-second audible countdown with direct native telephony intent dispatch (`Intent.ACTION_CALL`), guaranteeing life-safety availability during cellular dropouts or checkpoint jamming.
- **Security & Storage:**
  - Cryptographic material and local authentication tokens stored exclusively in Android Keystore via EncryptedSharedPreferences.
  - Sovereign Privacy (ADR-006): Contact address book names and details remain strictly on the local device; only random contact UUIDs are referenced in server communication. Zero raw location or audio recordings retained on disk.

### 4.2. Intent Classification & Dialect Normalizer
- **Responsibility:** Ingest spoken or transcribed Palestinian Arabic text, normalize dialect variations (e.g., phonetic shifts between Jerusalem, rural West Bank, and Gaza), and map the input into a validated, strongly-typed `StructuredAction`.
- **Architectural Constraints:**
  - Must never execute code or call external APIs.
  - Hybrid pipeline: Fast-path deterministic regex/rule matching for standardized accessibility queries; lightweight Arabic-capable language model for conversational normalization.
  - Output is strictly bounded by JSON Schema / Zod definitions and sealed with a cryptographic `candidateToken` (ADR-006) to prevent Confused Deputy payload injection.

### 4.3. Deterministic Policy Engine Kernel
- **Responsibility:** The supreme arbiter of system actions. Decides whether an action can proceed, must be confirmed, or is rejected.
- **Decision Engine Matrix:**
  - Evaluates: `(User Context, Device Health, Requested Action, Target Resource, Capability Grants, Risk Tier) -> PolicyDecision`.
  - Authoritative Confirmation (ADR-004): Confirmation requirements are derived authoritatively from `CAPABILITY_CONFIRMATION_RULES`, strictly ignoring any client- or AI-provided confirmation flags to prevent confirmation suppression.
  - Guarantees:
    - Zero external I/O during policy evaluation.
    - Zero random or probabilistic inputs.
    - Execution time $< 5\text{ ms}$.
- **Confirmation State Machine:**
  - Manages single-use challenge tokens for actions requiring user confirmation.
  - Generates culturally appropriate, concise Arabic confirmation text for screen readers (e.g., "هل تريد بالتأكيد الاستمرار؟ أجب بنعم أو لا").

### 4.4. Bounded Tool Executors
- **Responsibility:** Translate an authorized action into concrete device or server-side side effects.
- **Sandboxing & Isolation:**
  - Each tool executor implements a strict interface: `execute(action: ValidatedAction, token: AuthToken): Promise<ToolResult>`.
  - Tools reject any invocation lacking a cryptographically valid, non-expired authorization token issued by the Policy Engine.
  - Parameter Hash Verification (ADR-004): The executor strictly asserts that $\text{SHA-256}(\text{targetCapability} + \text{canonical}(\text{parameters})) == \text{token.actionHash}$ prior to execution, preventing parameter substitution attacks.
  - Sensitive domains (Calls, Messaging, Location, Calendar, Emergency) are **disabled by default** behind capability gates in this architectural phase.

### 4.5. Persistence & Audit Subsystem
- **Database:** PostgreSQL 16 utilizing row-level encryption for sensitive user preferences.
- **Audit Records & Zero-Phone Invariant (ADR-006):**
  - Every evaluated intent, policy decision, confirmation interaction, and tool execution writes an immutable, append-only audit event.
  - Zero telephone numbers or reversible phone hashes are permitted in audit tables, completely eliminating rainbow table de-anonymization. All identities are cryptographically pseudonymized.

---

## 5. Technology Stack & Justification

| Layer | Technology Selected | Rationale | Cost / Licensing |
|---|---|---|---|
| **Mobile Client** | React Native (TypeScript) | Cross-platform code-sharing with deep Android TalkBack accessibility bridge. | Open Source (MIT) |
| **Backend Runtime** | Node.js (v20 LTS) + TypeScript | Type-safe end-to-end schemas, high asynchronous I/O efficiency, massive ecosystem. | Open Source (MIT) |
| **Backend Architecture**| Modular Monolith | Eliminates distributed systems failure modes, zero network serialization latency between modules, simple deployment for 10–30 user pilot. | Open Source |
| **Database** | PostgreSQL 16 | ACID-compliant, battle-tested, robust JSONB support, row-level security. | Open Source (PostgreSQL) |
| **Speech-to-Text (STT)**| Whisper Small / Android Native SpeechRecognizer | Local / self-hosted or native on-device processing; zero cloud telephony charges. | Open Source (MIT / Apache) |
| **Text-to-Speech (TTS)**| Android Native Arabic TTS / Coqui / Piper | High intelligibility with Palestinian screen reader settings, zero runtime API cost. | Open Source / Device-Native |
| **GIS / Geocoding** | OpenStreetMap (Nominatim / OSRM) | Replaces paid Google Maps APIs with self-hosted / free-tier open geospatial data. | ODbL / Open Source |

---

## 6. Non-Functional Requirements & System Budgets

```text
+------------------------+---------------------------------------+
| Metric                 | Target Budget                         |
+------------------------+---------------------------------------+
| Audio Latency (Earcon) | < 50 ms (instant perceptual feedback) |
| Intent Classification  | < 350 ms (Local/Self-hosted)          |
| Policy Decision Time   | < 10 ms (Deterministic evaluation)    |
| End-to-End Voice Round | < 1200 ms total turnaround            |
| Offline Tolerance      | Core accessibility navigation works   |
| Availability Target    | 99.5% for pilot phase                 |
+------------------------+---------------------------------------+
```

---

## 7. Architectural Governance & Invariants

1. **No Direct Tool Invocation:** No AI model or conversational agent shall import, reference, or call any tool executor.
2. **Schema Invariant:** Every intent emitted by the AI must conform to an exact TypeScript type and Zod schema. Unrecognized fields are stripped and flagged as anomalous.
3. **Deny-by-Default:** Any unhandled exception, network partition, or missing permission token in the Policy Engine evaluates to `DENY`.
4. **Data Minimization:** No ephemeral user location or raw speech audio is persisted past the immediate request execution window.
