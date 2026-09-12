# Sanad Capability Matrix

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Classification:** Product & Security Specification  

---

## 1. Capability Taxonomy & Governance

A **Capability** in Sanad is a distinct operational domain that performs actions, queries information, or alters state on behalf of the user. To enforce least privilege and safeguard vulnerable users against unintended real-world consequences, every capability is assigned:
- A unique Capability Identifier.
- A deterministic **Risk Tier** (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- An **Execution Target** (`DEVICE_LOCAL` vs. `BACKEND_SERVER`).
- A mandatory **Confirmation Policy** (`NONE`, `EXPLICIT_CONFIRMATION`, `MULTI_STEP_CONFIRMATION`).
- An **Implementation State** (`ACTIVE_CORE`, `DEFERRED_SCOPE`, `BLOCKED_PENDING_GATE`).

---

## 2. Comprehensive Capability Matrix

The table below maps all capabilities specified in the Master Plan and platform governance:

| Capability ID | Domain | Execution Target | Risk Tier | User Confirmation Required? | OS Permissions Required | Current Implementation Status |
|---|---|---|---|---|---|---|
| `CAP_ASSISTANT_QUERY` | Core Assistant | Server | `LOW` | No | None | **ACTIVE_CORE** |
| `CAP_ALIAS_MANAGE` | Contact Aliases | Server / Device | `LOW` | No (Voice feedback only) | None | **ACTIVE_CORE** |
| `CAP_SETTINGS_ACCESSIBILITY`| Device Settings | Device | `LOW` | No | None | **ACTIVE_CORE** |
| `CAP_AUDIT_INSPECT` | Privacy / Logs | Server | `LOW` | No | None | **ACTIVE_CORE** |
| `CAP_ACTION_CANCEL` | Safety Controls | Client / Server | `LOW` | No (Immediate preempt) | None | **ACTIVE_CORE** |
| `CAP_CONTACT_CALL` | Telephony | Device Native | `HIGH` | **YES (Always)** | `CALL_PHONE` / `DIAL` | **DEFERRED_GATED** (Constraint Enforced) |
| `CAP_MESSAGE_SEND` | Messaging | Device Native | `HIGH` | **YES (Always + Readback)** | `SEND_SMS` | **DEFERRED_GATED** (Constraint Enforced) |
| `CAP_LOCATION_READ` | Geolocation | Device Native | `MEDIUM` | Conditional | `ACCESS_FINE_LOCATION` | **DEFERRED_GATED** (Constraint Enforced) |
| `CAP_LOCATION_SHARE` | Geolocation | Device / Server | `HIGH` | **YES (Always + Recipient)**| `ACCESS_FINE_LOCATION` | **DEFERRED_GATED** (Constraint Enforced) |
| `CAP_CALENDAR_READ` | Scheduling | Device / API | `LOW` | No | `READ_CALENDAR` | **DEFERRED_GATED** (Constraint Enforced) |
| `CAP_CALENDAR_WRITE` | Scheduling | Device / API | `MEDIUM` | **YES (Summary Readback)** | `WRITE_CALENDAR` | **DEFERRED_GATED** (Constraint Enforced) |
| `CAP_EMERGENCY_TRIGGER`| Safety / Life | Device Native | `CRITICAL` | Predefined Protocol | `CALL_PHONE`, `LOCATION` | **DEFERRED_GATED** (Constraint Enforced) |

---

## 3. Detailed Capability Profiles

### 3.1. Core Active Capabilities (Immediate Baseline)

#### `CAP_ASSISTANT_QUERY`
- **Description:** General accessibility assistance, help instructions, time/date checks, battery status, and explanation of system features in Palestinian Arabic.
- **Risk Rationale:** Read-only, zero side effects on external state or user data.
- **Safety Gate:** Intent sanitization to prevent prompt injection or hallucinated advice.

#### `CAP_ALIAS_MANAGE`
- **Description:** Creating, listing, and modifying semantic nicknames for contacts (e.g., mapping "مرتي" [my wife] to an existing contact entity, or "دكتور العيون" [eye doctor]).
- **Risk Rationale:** Internal lookup metadata. Does not initiate calls or communicate externally.
- **Safety Gate:** Confirmation required only when overwriting an existing alias.

#### `CAP_ACTION_CANCEL`
- **Description:** Immediate verbal or gesture-based cancellation of any active confirmation prompt, audio speech output, or queued task ("وقف", "إلغي", "بلاش").
- **Risk Rationale:** Essential safety override.
- **Safety Gate:** Must have zero latency, highest execution priority, and preempt all ongoing TTS audio.

---

### 3.2. Sensitive Capabilities (Formally Deferred & Gated)

Pursuant to explicit architectural governance and user constraints (**"Do not implement calls, messaging, location, calendar or emergency functionality"**), the following five capability domains are **strictly disabled and gated** in the current phase. Their technical requirements and gating criteria are specified below for future phases:

#### 1. `CAP_CONTACT_CALL` (Contact Calling) — *DEFERRED*
- **Description:** Initiating cellular voice telephone calls to resolved contacts or aliases.
- **Risk Profile:** High financial and social risk (accidental dialing, calling during nighttime, misidentified recipient).
- **Required Security Gates Prior to Unfreezing:**
  1. Validation of Android telecom permissions under Google Play Store policy (avoiding restricted `CALL_PHONE` background violations; using explicit `ACTION_DIAL` intents with visual/audio confirmation).
  2. Completion of Palestinian dialect contact-resolution testing with blind users (error rate $< 2\%$).
  3. Red-team testing against misheard phonetically similar contact names.

#### 2. `CAP_MESSAGE_SEND` (Messaging) — *DEFERRED*
- **Description:** Composing and dispatching native SMS or chat messages.
- **Risk Profile:** High reputational and privacy risk (sending unedited or erroneous speech-to-text transcriptions).
- **Required Security Gates Prior to Unfreezing:**
  1. Mandatory audio read-back loop: The complete message body and recipient name must be read aloud by TTS and explicitly confirmed by the user before dispatch.
  2. Resolution of Android SMS permission restrictions (handling native SMS apps without background SMS abuse).
  3. Absolute prohibition of silent message sending.

#### 3. `CAP_LOCATION_READ` & `CAP_LOCATION_SHARE` (Location Services) — *DEFERRED*
- **Description:** Retrieving GPS coordinates and sharing location descriptions with contacts.
- **Risk Profile:** High personal safety and geopolitical privacy risk in Palestine (continuous tracking, surveillance exposure).
- **Required Security Gates Prior to Unfreezing:**
  1. Implementation of zero-retention ephemeral location handling (coordinates deleted immediately after reverse-geocoding into descriptive Arabic text).
  2. Integration of self-hosted / free OpenStreetMap reverse-geocoder to avoid third-party proprietary tracking.
  3. Multi-tier confirmation for any external location transmission.

#### 4. `CAP_CALENDAR_READ` & `CAP_CALENDAR_WRITE` (Calendar Services) — *DEFERRED*
- **Description:** Reading upcoming appointments and scheduling/modifying events.
- **Risk Profile:** Medium risk (accidental deletion or missed medical/personal appointments).
- **Required Security Gates Prior to Unfreezing:**
  1. Evaluation of Android local calendar provider vs. OAuth2-based free Google Calendar.
  2. Conflict detection algorithms for overlapping events.
  3. Full audio summary read-back before committing any calendar write or deletion.

#### 5. `CAP_EMERGENCY_TRIGGER` (Emergency Workflow) — *DEFERRED*
- **Description:** Triggering rapid alerts or calls to predefined trusted emergency contacts or official emergency services.
- **Risk Profile:** Critical life-safety liability. False positives waste emergency resources; false negatives endanger lives.
- **Required Security Gates Prior to Unfreezing:**
  1. Strict architectural prohibition of LLM-based emergency decisions. Emergency workflows must be 100% hardcoded state machines triggered by dedicated hardware buttons or unmistakable Arabic distress keywords ("طوارئ", "النجدة").
  2. Formal validation with Palestinian disability organizations and emergency service authorities.
  3. Dedicated red-team stress testing in offline and low-connectivity scenarios.

---

## 4. Capability Lifecycle & Feature Flag Enforcement

Every capability's activation state is governed by a centralized, immutable configuration guard in `backend/packages/common/capabilities.ts`:

```typescript
export const CAPABILITY_CONFIG = {
  CAP_ASSISTANT_QUERY: { enabled: true,  requiresAuth: true },
  CAP_ALIAS_MANAGE:    { enabled: true,  requiresAuth: true },
  CAP_SETTINGS_ACCESSIBILITY: { enabled: true, requiresAuth: false },
  CAP_AUDIT_INSPECT:   { enabled: true,  requiresAuth: true },
  CAP_ACTION_CANCEL:   { enabled: true,  requiresAuth: false },

  // GATED / DEFERRED (Strictly disabled)
  CAP_CONTACT_CALL:    { enabled: false, reason: "DEFERRED_PHASE_1_GOVERNANCE" },
  CAP_MESSAGE_SEND:    { enabled: false, reason: "DEFERRED_PHASE_1_GOVERNANCE" },
  CAP_LOCATION_READ:   { enabled: false, reason: "DEFERRED_PHASE_1_GOVERNANCE" },
  CAP_LOCATION_SHARE:  { enabled: false, reason: "DEFERRED_PHASE_1_GOVERNANCE" },
  CAP_CALENDAR_READ:   { enabled: false, reason: "DEFERRED_PHASE_1_GOVERNANCE" },
  CAP_CALENDAR_WRITE:  { enabled: false, reason: "DEFERRED_PHASE_1_GOVERNANCE" },
  CAP_EMERGENCY_TRIGGER: { enabled: false, reason: "DEFERRED_PHASE_1_GOVERNANCE" },
} as const;
```

Any attempt by any module or user request to execute a gated capability triggers a deterministic `POLICY_CAPABILITY_DISABLED` response with an accessible Arabic explanation.
