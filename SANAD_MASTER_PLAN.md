# Sanad Accessible AI — Master Execution Plan

## Purpose

Sanad is an Arabic-first AI accessibility assistant for blind and visually impaired Palestinians. The MVP is a React Native mobile application with secure AI-assisted intent recognition and deterministic tool execution.

The system is designed around one non-negotiable rule:

> **The AI may propose an action, but only the Policy Engine may authorize it, and only a bounded Tool Executor may execute it.**

## MVP capabilities

1. Contact calling
2. Messaging
3. Current location
4. Location sharing
5. Calendar assistant
6. Calendar scheduling
7. Emergency workflow

## Delivery phases

| Phase | Duration | Primary outcome |
|---|---:|---|
| 1. Discovery & Co-Design | Weeks 1–4 | Requirements, threat model, accessibility baseline |
| 2. Free Technology Validation | Weeks 5–8 | Validated local AI/STT/TTS/device stack |
| 3. MVP Development | Weeks 9–20 | Seven capabilities behind the security kernel |
| 4. Controlled Pilot | Weeks 21–28 | 10–30 user pilot and measured outcomes |
| 5. Expansion | Week 29+ | iOS parity, additional integrations and broader accessibility |

> **Timeline correction:** the source labels Phase 3 as **6 two-week sprints** but numbers the responsibilities 1–12. In this package, those 1–12 entries are treated as **12 work packages grouped into 6 two-week sprints**, preserving the stated Weeks 9–20 schedule. The end-to-end MVP-to-pilot plan is therefore **28 weeks**.

## Team

- Solution Architect / Technical Lead
- Backend / AI Engineer
- React Native / Mobile Engineer
- QA / Accessibility Engineer
- Part-time Product / Accessibility Lead
- Optional part-time security/privacy, Arabic UX, legal and DevOps specialists

## Critical path

1. Threat model
2. Capability and permission model
3. Policy Engine skeleton
4. Local AI/STT/TTS validation
5. Secure mobile capability proofs of concept
6. First vertical slice: intent → policy → confirmation → tool → audit
7. Repeat vertical slice for remaining capabilities
8. Security/accessibility gates
9. Controlled pilot

## Core repositories/modules

```text
accessible-ai-assistant/
├── .agents/
│   └── agents/
├── adrs/
├── docs/
│   ├── architecture/
│   ├── security/
│   ├── accessibility/
│   ├── product/
│   └── runbooks/
├── mobile/
├── backend/
│   ├── packages/
│   │   ├── policy-engine/
│   │   ├── intent-classifier/
│   │   ├── tool-executors/
│   │   ├── audit-log/
│   │   └── api/
│   └── infrastructure/
├── ai-models/
└── testing/
    ├── a11y/
    ├── security/
    └── contract/
```

## Definition of Done for every capability

A capability is not complete when the happy path works. It requires:

- structured intent schema
- authorization policy
- confirmation policy
- bounded tool executor
- failure/timeout behavior
- audit event
- unit tests
- integration/contract tests
- accessibility test
- negative/security tests
- Arabic test cases
- documentation/ADR when architecture changes

## Security gates

- Threat model approved
- Policy tests pass
- Tool access is deny-by-default
- No LLM direct tool authorization
- Sensitive action confirmation works
- No unnecessary location retention
- No raw sensitive data in logs
- Emergency workflow has dedicated red-team tests
- Accessibility regression suite passes
- Pilot readiness review complete

## Success criteria

Initial pilot targets:

- ≥90% task completion for supported capabilities
- <5% unintended action rate
- >90% intent recognition on the defined MVP evaluation set
- Zero unauthorized sensitive actions
- Strong accessibility satisfaction
- No unresolved critical privacy/security issue

Targets are provisional until baseline testing with blind users is complete.
