# Sanad (سند) — Accessible AI Assistant for Blind Palestinians

**Sanad** is an Arabic-first assistive accessibility platform designed specifically for blind and visually impaired Palestinian users. Delivered through a dedicated Android-first React Native application, Sanad enables users to interact naturally with their smartphones and everyday digital services using conversational Palestinian Arabic, eliminating reliance on visually oriented touch interfaces.

---

## Non-Negotiable Core Principle

> **"The AI may propose an action, but only the deterministic Policy Engine may authorize it, and only a bounded Tool Executor may execute it."**

Under no circumstances does an Artificial Intelligence model (LLM, SLM, or heuristic classifier) have direct access to system tools, device APIs, or communication hardware.

```text
User ──► AI/Intent ──► Structured Action ──► Policy Engine ──► Tool Executor
```

---

## Documentation Index

The platform governance, architecture, security, product, and decision records are organized as follows:

### Architecture
- [System Architecture](file:///Users/macbook/Documents/Sanad/docs/architecture/SYSTEM_ARCHITECTURE.md) — High-level pipeline, component topology, tech stack, and non-functional requirements.
- [Component Boundaries](file:///Users/macbook/Documents/Sanad/docs/architecture/COMPONENT_BOUNDARIES.md) — Modular monolith package structure, dependency rules, and boundary enforcement.
- [Capability Matrix](file:///Users/macbook/Documents/Sanad/docs/architecture/CAPABILITY_MATRIX.md) — Comprehensive capability taxonomy, risk ratings, and implementation status.
- [Permission Matrix](file:///Users/macbook/Documents/Sanad/docs/architecture/PERMISSION_MATRIX.md) — Multi-tier authorization model, OS permissions, and deterministic evaluation logic.
- [API Contracts](file:///Users/macbook/Documents/Sanad/docs/architecture/API_CONTRACTS.md) — RESTful endpoints, DTO schemas, and Zod/TypeScript interface definitions.

### Security & Privacy
- [Security Model](file:///Users/macbook/Documents/Sanad/docs/security/SECURITY_MODEL.md) — The security kernel, HMAC token protocol, and prompt injection defenses.
- [Data Classification](file:///Users/macbook/Documents/Sanad/docs/security/DATA_CLASSIFICATION.md) — Four-tier data classification, retention limits, and Palestine privacy protections.
- [Threat Model](file:///Users/macbook/Documents/Sanad/docs/security/THREAT_MODEL.md) — STRIDE analysis, threat actors, and automated security test assertions.

### Product & Accessibility
- [MVP Scope](file:///Users/macbook/Documents/Sanad/docs/product/MVP_SCOPE.md) — In-scope baseline capabilities, out-of-scope gated features, and pilot metrics.
- [User Flows](file:///Users/macbook/Documents/Sanad/docs/product/USER_FLOWS.md) — Voice-first and TalkBack interaction design, sound cues (earcons), and dialogue flows.
- [Arabic Intents](file:///Users/macbook/Documents/Sanad/docs/product/ARABIC_INTENTS.md) — Palestinian dialect taxonomy, utterance equivalence sets, and normalization rules.

### Architecture Decision Records (ADRs)
- [ADR-001](file:///Users/macbook/Documents/Sanad/docs/decisions/ADR-001.md) — Separation of Generative AI Intent Classification from Deterministic Policy Enforcement.
- [ADR-002](file:///Users/macbook/Documents/Sanad/docs/decisions/ADR-002.md) — Modular Monolith Architecture (Node.js + TypeScript) and Free/Open-Source Stack.
- [ADR-003](file:///Users/macbook/Documents/Sanad/docs/decisions/ADR-003.md) — Android-First React Native Client with Native Accessibility (TalkBack) Integration.

---

## Delivery Phases

| Phase | Duration | Scope & Focus |
|---|---|---|
| **Phase 1: Discovery & Co-Design** | Weeks 1–4 | Requirements with blind users, threat model, accessibility baseline. |
| **Phase 2: Free Tech Validation** | Weeks 5–8 | Arabic STT/TTS benchmarks, device permission boundaries, offline behavior. |
| **Phase 3: MVP Development** | Weeks 9–20 | 12 work packages (6 two-week sprints) building core accessibility and gated capabilities. |
| **Phase 4: Controlled Pilot** | Weeks 21–28 | 10–30 blind Palestinian users; task completion and accessibility evaluation. |
| **Phase 5: Expansion** | Week 29+ | iOS parity, public service integrations, and broader accessibility features. |

---

## Governance & Safety Invariants

1. **AI Never Directly Executes Tools:** All actions pass through the deterministic Policy Engine.
2. **Deterministic Policy Decisions:** Policy logic contains zero machine learning and zero probabilistic heuristics.
3. **Android-First MVP:** Focused on TalkBack screen-reader integration for low-to-mid-tier Android smartphones.
4. **Modular Monolith Backend:** TypeScript/Node.js backend avoiding premature microservice complexity.
5. **Gated Sensitive Features:** Calling, messaging, location, calendar, and emergency capabilities are strictly gated and disabled until formal security and co-design validation gates are satisfied.
