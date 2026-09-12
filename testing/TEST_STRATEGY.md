# Sanad Phase 2 Master Test & Quality Assurance Strategy

**Document Version:** 1.0.0  
**Status:** Approved QA Baseline  
**Classification:** Quality Assurance & Accessibility Framework  
**Owner:** Sanad QA & Accessibility Engineer  

---

## 1. Quality Mission & Context

**Sanad (سند)** is an Arabic-first assistive accessibility platform designed specifically for blind and visually impaired Palestinians. Because blind users interact with their mobile devices primarily through audio (Android TalkBack screen reader, speech recognition, auditory earcons) and cannot visually inspect on-screen dialogs, software errors are not mere inconveniences—they can lead to severe real-world harm, social embarrassment, financial cost, or physical vulnerability.

The core safety invariant governs all QA and test engineering:
> **"The AI may propose an action, but only the Policy Engine may authorize it, and only a bounded Tool Executor may execute it."**

### Active vs. Deferred Scope Boundary (Phase 2)
In strict accordance with project governance:
- **In-Scope Baseline Capabilities Tested:**
  1. Assistant Queries & Status (`CAP_ASSISTANT_QUERY`)
  2. Contact Alias Management (`CAP_ALIAS_MANAGE`)
  3. Device & Screen Reader Accessibility Settings (`CAP_SETTINGS_ACCESSIBILITY`)
  4. Privacy & Audit Inspection (`CAP_AUDIT_INSPECT`)
  5. Immediate Verbal & Gesture Action Cancellation (`CAP_ACTION_CANCEL`)
  6. Emergency Purge & Local Reset Protocol
  7. Deterministic Capability Gating for Deferred Domains
- **Out-of-Scope / Gated Capabilities:**
  - Contact Calling (`CAP_CONTACT_CALL`), SMS Messaging (`CAP_MESSAGE_SEND`), Location Services (`CAP_LOCATION_READ`, `CAP_LOCATION_SHARE`), Calendar (`CAP_CALENDAR_READ`, `CAP_CALENDAR_WRITE`), Automated Emergency Dispatch (`CAP_EMERGENCY_TRIGGER`).
  - **Rule:** We do not test features that do not exist yet. Gated capabilities are tested *only* to assert that the Policy Engine deterministically denies them with `POLICY_ERR_CAPABILITY_DISABLED`.

---

## 2. The Golden Rule of Sanad QA

> **Never test only the happy path.**

For **every** capability and user-facing interaction, test suites must implement all **8 Golden Variations**:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       THE 8 GOLDEN TEST VARIATIONS                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Valid Request        │ Happy-path execution with valid tokens & params  │
│  2. Ambiguous Request    │ Acoustic collision, homophone, or multi-matches  │
│  3. Unauthorized Request │ User consent missing or token revoked            │
│  4. Denied Permission    │ Android OS runtime permission denied/revoked     │
│  5. Network Failure      │ Connection drop, high packet loss, 3G timeout    │
│  6. Malformed Input      │ Schema violations, unexpected/injected keys      │
│  7. Repeated Request     │ Duplicate submissions, replay attacks            │
│  8. Cancellation         │ Fast-path verbal "وقف/إلغي" or tactile abort     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Golden Matrix by Capability

| Capability ID | 1. Valid | 2. Ambiguous | 3. Unauthorized | 4. Denied Perm | 5. Network Loss | 6. Malformed | 7. Repeated | 8. Cancelled |
|---|---|---|---|---|---|---|---|---|
| `CAP_ASSISTANT_QUERY` | Status returned | Follow-up prompt | Consent prompt | Audio fallback | Offline cache | 400 Bad Request | Idempotent | Preempted |
| `CAP_ALIAS_MANAGE` | Alias saved | Disambiguate contacts | Rejection | Contact perm error | Offline queue | Missing slot fail | Nonce re-used fail | Overwrite abort |
| `CAP_SETTINGS_ACCESSIBILITY` | Setting applied | Default fallback | Rejection | N/A | Local applied | Unknown prop fail | Idempotent | Revert state |
| `CAP_AUDIT_INSPECT` | Audio summary | Timeframe clarify | Consent required| N/A | Offline prompt | Invalid filter | Idempotent | Audio silence |
| `CAP_ACTION_CANCEL` | Immediate abort | Silence audio | Immediate abort | Immediate abort | Local abort | Immediate abort | Idempotent | Preempts all |
| *Gated Capabilities* | **DENIED (Gate)**| **DENIED (Gate)** | **DENIED (Gate)** | **DENIED (Gate)** | **DENIED (Gate)**| **DENIED (Gate)**| **DENIED (Gate)**| **DENIED (Gate)**|

---

## 3. Test Architecture & Layer Hierarchy

The Sanad test framework is structured into five cohesive layers:

```text
testing/
├── TEST_STRATEGY.md             # Master QA strategy and policy governance
├── support/                     # Shared test utilities, mocks, contracts, and normalizers
│   ├── contracts.ts             # Zod schemas matching API_CONTRACTS.md
│   ├── policy-evaluator.ts      # Reference deterministic Policy Engine kernel
│   ├── arabic-normalizer.ts     # Palestinian Arabic normalizer & vocabulary sets
│   └── mock-data.ts             # Palestinian contacts, contexts, and actions
├── accessibility/               # TalkBack, Earcons, Screen Curtain, and Voice Tests
│   ├── talkback-semantics.test.ts
│   ├── earcon-audio-cues.test.ts
│   ├── voice-interruptibility.test.ts
│   ├── screen-curtain.test.ts
│   └── non-visual-guidance.test.ts
├── contracts/                   # Ingress/Egress Schema Validation & Boundary Tests
│   └── api-contracts.test.ts
├── integration/                 # End-to-End Golden Rule Pipeline & Policy Verification
│   ├── policy-engine.test.ts
│   └── golden-rule-capabilities.test.ts
├── intent/                      # Palestinian Arabic NLP Benchmark & Dataset Skeleton
│   ├── arabic-intent-dataset.json
│   └── arabic-intent-benchmark.test.ts
├── security/                    # Negative Security, Prompt Injection & Privacy Tests
│   └── negative-security.test.ts
└── e2e/                         # Screen-Reader User Journeys
    └── screen-reader-user-flows.test.ts
```

---

## 4. Specific Quality Disciplines & Verification

### 4.1. Palestinian Arabic Dialect Recognition
- **Dialect Topology:** Urban (*Madani* - Jerusalem, Ramallah), Rural (*Fellahi* - West Bank, Gaza villages), Bedouin (*Badawi* - Naqab, Jordan Valley).
- **Target Accuracy:** $\ge 90.0\%$ intent recognition on curated dialect corpus.
- **Fast-Path Abort Keywords:** $\ge 98.0\%$ detection rate on cancellation keywords ("وقف", "إلغي", "اسكت", "بلاش", "فكك").
- **Kinship Normalization:** Canonical resolution of dialect variations (e.g., "مرتي", "جوزي", "أبوي", "يما", "الحج").
- **Disambiguation Triggers:** Confidence scores in $[0.60, 0.80]$ must trigger clarifying question rather than guessing.

### 4.2. Android TalkBack Screen-Reader Accessibility
- **Semantic Roles:** Every interactive node must declare `accessibilityRole` (`button`, `header`, `alert`, `none`).
- **Live Regions:** State transitions must use `accessibilityLiveRegion`:
  - `"polite"` for background notifications and processing statuses.
  - `"assertive"` for critical challenges, confirmation prompts, and emergency cancellations.
- **Touch Targets:** Minimum $48 \times 48\text{ dp}$ with $\ge 8\text{ dp}$ spacing.
- **Visual Metaphor Prohibition:** Zero visual phrases in audio TTS (e.g., forbidding "اضغط على الزر الأخضر" or "انظر إلى الشاشة"; requiring "أجب بنعم أو لا").

### 4.3. Auditory Non-Speech Cues ("Earcons")
- **Audio Feedback Budget:** $< 50\text{ ms}$ playback initiation upon state change.
- **Standard Earcon Profiles:**
  - `EARCON_LISTENING_START`: Rising chime (mic active).
  - `EARCON_THINKING`: Low rhythmic pulse (processing).
  - `EARCON_CONFIRM_CHALLENGE`: Two-tone inquiry bell (confirmation required).
  - `EARCON_SUCCESS`: Harmonic major chord (authorized action completed).
  - `EARCON_CANCELLED`: Soft descending tone (action aborted).
  - `EARCON_ERROR`: Low warning chime (denied or failed).

### 4.4. Security, Token Lifecycle & Replay Prevention
- **HMAC-SHA256 Signatures:** Tokens signed with ephemeral server secret; tamper-evident.
- **Anti-Replay Cache:** Nonces marked consumed immediately upon use; duplicate submissions return `TOKEN_ERR_REPLAY_CONSUMED`.
- **Time-To-Live (TTL):**
  - Confirmation Challenge Token: Exactly **30 seconds**.
  - Execution Grant Token: Exactly **10 seconds**.
- **Data Minimization:** Zero raw GPS coordinates, phone numbers, or unmasked transcripts in logs or disk storage.

### 4.5. Environmental & Hardware Resilience
- **Network Outages:** Graceful degradation on 3G network packet loss and full offline dropouts.
- **Low Battery Mode:** Automatic throttling of non-critical TTS verbosity when battery $< 15\%$.
- **Emergency Purge Mode:** Immediate wipe of local encrypted preferences, session tokens, and local cache.

---

## 5. Pass/Fail Gates for Pilot Deployment (10–30 Users)

1. `100%` pass rate on all deterministic Policy Engine test suites.
2. `100%` compliance on TalkBack semantic node assertions.
3. $\ge 90\%$ intent recognition accuracy on Palestinian dialect benchmark.
4. Zero unauthorized sensitive tool actions.
5. All gated capabilities strictly verified disabled in release builds.
6. Zero plaintext PII or raw GPS coordinates in audit telemetry fixtures.
