# Sanad MVP Scope Specification

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Classification:** Product Governance & Scope Boundary  

---

## 1. Product Vision & Mission

**Sanad (سند)** is an Arabic-first assistive accessibility platform engineered for blind and visually impaired Palestinians. The mission is to restore everyday digital independence by replacing visual, touch-screen navigation with safe, conversational natural language in Palestinian Arabic.

Unlike generic commercial voice assistants that demand Standard Arabic (Fusha) or English and rely on visual confirmation cards, Sanad is built from the ground up for **voice-first and screen-reader-first interaction**, respecting local linguistic dialects, low-cost Android hardware, and stringent privacy requirements.

---

## 2. Target Users & Operating Environment

### Target Audience
- Blind and visually impaired individuals living in Palestine (West Bank, Gaza, Jerusalem).
- Native speakers of Palestinian Arabic dialects (Urban, Rural, Bedouin).
- Users relying on Android TalkBack screen reader technology.

### Device Baseline
- **Hardware:** Low-to-mid-range Android smartphones (2GB–4GB RAM, Android 8.0+ / API 26+).
- **Connectivity:** Intermittent 3G / Wi-Fi networks characterized by frequent outages and high packet loss.
- **Cost Requirement:** Zero recurring subscription cost to end users. Must operate on free and open-source software and existing mobile network allowances.

---

## 3. In-Scope MVP Baseline Capabilities

The immediate MVP scope focuses on perfecting the core accessibility, linguistic, and security foundation before introducing real-world side-effect tools:

```text
+-------------------------------------------------------------------------------+
| IN-SCOPE MVP CORE SYSTEM                                                      |
|                                                                               |
| 1. Arabic Conversational Interface & Speech Layer                             |
|    - Palestinian dialect speech-to-text (STT) ingestion                      |
|    - High-intelligibility Arabic text-to-speech (TTS) output                  |
|    - Comprehensive auditory non-speech cues ("earcons")                       |
|                                                                               |
| 2. Accessibility & Screen-Reader Subsystem                                    |
|    - 100% Android TalkBack compatibility (accessible labels, live regions)    |
|    - Screen Curtain privacy mode (blackout display during voice interaction)   |
|    - Instant voice/gesture cancellation ("وقف", "إلغي")                       |
|                                                                               |
| 3. Arabic Intent Recognition Engine                                           |
|    - Phonetic and dialect normalization for Palestinian Arabic                |
|    - Strict structured action emission (JSON Schema / Zod)                    |
|                                                                               |
| 4. Deterministic Security Kernel (Policy Engine)                              |
|    - RBAC/ABAC authorization checks                                           |
|    - Risk-based confirmation challenge state machine                          |
|    - Anti-replay cryptographic token signing                                  |
|                                                                               |
| 5. Contact Alias Management Subsystem                                         |
|    - Configurable nicknames ("مرتي", "أخوي", "الدكتور")                       |
|    - Deterministic disambiguation of duplicate names                          |
|                                                                               |
| 6. Audit & Sovereign Privacy Subsystem                                        |
|    - Append-only, zero-PII audit logging                                      |
|    - Instant emergency purge mode for checkpoint safety                       |
+-------------------------------------------------------------------------------+
```

---

## 4. Out-of-Scope Capabilities (Formally Deferred & Gated)

Pursuant to explicit project constraints and governance directives:

> **"Do not implement calls, messaging, location, calendar or emergency functionality."**

The following five sensitive capabilities from the conceptual roadmap are **strictly excluded from implementation** in the current development phase. They remain gated architectural placeholders until explicit gating criteria are met.

```text
+-------------------------------------------------------------------------------+
| OUT-OF-SCOPE / FORMALLY GATED CAPABILITIES                                    |
|                                                                               |
| [X] Contact Calling (`CAP_CONTACT_CALL`)                                      |
| [X] SMS / Instant Messaging (`CAP_MESSAGE_SEND`)                              |
| [X] Real-Time Location Retrieval & Sharing (`CAP_LOCATION_READ`, `_SHARE`)    |
| [X] Calendar Integration & Scheduling (`CAP_CALENDAR_READ`, `_WRITE`)         |
| [X] Automated Emergency Services Dispatch (`CAP_EMERGENCY_TRIGGER`)           |
+-------------------------------------------------------------------------------+
```

### Technical & Safety Justifications for Scope Exclusion

#### 1. Telephony (`CALL_CONTACT`) Exclusion Rationale
- **Platform Policy:** Modern Android (Android 11+) and Google Play Store policies forbid granting `CALL_PHONE` (background dialing) to third-party accessibility apps without strict accessibility declaration reviews.
- **Safety Risk:** Non-deterministic dialing triggered by acoustic misinterpretation can place unintended calls (including costly international or sensitive personal calls) without visual verification by the blind user.

#### 2. Messaging (`SEND_SMS`) Exclusion Rationale
- **Platform Policy:** Google Play Store restricts `SEND_SMS` exclusively to apps configured as the default SMS handler.
- **Reputational / Social Risk:** Speech-to-text engines frequently mistranscribe Arabic dialects. Transmitting unreviewed text without an airtight, multi-modal read-back confirmation loop creates severe social and privacy hazards.

#### 3. Location Services (`LOCATION_READ`, `LOCATION_SHARE`) Exclusion Rationale
- **Geopolitical & Surveillance Risk:** In the Palestinian context, precise GPS tracking data is sensitive. Any unintended transmission or logging of location exposes users to physical checkpoint interrogations or third-party surveillance.
- **Dependency Constraint:** The system must first validate a completely local/self-hosted OpenStreetMap geocoding pipeline before processing GPS data.

#### 4. Calendar Services (`CALENDAR_READ`, `CALENDAR_WRITE`) Exclusion Rationale
- **Complexity & Error Tolerance:** Calendar synchronization requires complex conflict resolution, time zone handling, and third-party OAuth2 integration. Accidental modification or cancellation of critical medical appointments poses direct harm.

#### 5. Emergency Workflow (`EMERGENCY_TRIGGER`) Exclusion Rationale
- **Life-Safety Liability:** An automated emergency dispatch system cannot be powered by AI. False positives flood emergency responders (101 Red Crescent, 102 Civil Defense, 100 Police); false negatives lead to fatal outcomes.
- **Governance Gate:** This capability cannot be implemented without prior formal agreements, API protocols, and validation with Palestinian emergency services and disability organizations.

---

## 5. Definition of Done (DoD) for Capability Activation

Before any deferred capability can be moved into the active implementation scope, it must satisfy all 12 criteria established in the Master Plan:

1. **Formal Intent Schema:** Validated Zod DTO schema with zero undeclared fields.
2. **Deterministic Policy Rules:** Hardcoded rule set in the Policy Engine with unit test coverage.
3. **Confirmation Protocol:** Audio read-back and explicit confirmation flow implemented.
4. **Bounded Executor Sandbox:** Stateless executor verifying single-use authorization tokens.
5. **Safe Timeout & Fallback:** Deterministic behavior if network or device APIs timeout.
6. **Audit Event Generation:** Structured telemetry logged without plaintext PII.
7. **Unit Test Suite:** $\ge 95\%$ code coverage of authorization and execution paths.
8. **Contract Integration Tests:** Verified interaction between client, gateway, and tool.
9. **Screen-Reader Accessibility:** 100% TalkBack compliance, correct live regions, and earcons.
10. **Negative & Security Tests:** Verified defense against prompt injection and replay attacks.
11. **Palestinian Dialect Benchmark:** $\ge 90\%$ accuracy across dialect test suites.
12. **Architecture Decision Record (ADR):** Documented and human-approved architectural change.

---

## 6. Pilot Target Metrics (10–30 Blind Users)

- $\ge 90\%$ task completion rate for active baseline capabilities.
- $< 5\%$ unintended action rate.
- $> 90\%$ intent recognition accuracy on the curated Palestinian Arabic test set.
- **Zero** unauthorized sensitive actions.
- $100\%$ accessibility satisfaction on TalkBack navigation and audio cues.
