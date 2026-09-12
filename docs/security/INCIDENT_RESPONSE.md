# Sanad Incident Response & Security Escalation Plan

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Classification:** Security Operations Specification  

---

## 1. Objectives & Incident Classification

This document outlines the operational procedures for detecting, containing, investigating, and remediating security or safety incidents within the Sanad platform.

Given that Sanad executes real-world actions for blind users, safety incidents (e.g., unintended phone calls or incorrect emergency triggers) are treated with the same severity as technical security breaches.

### Severity Tiers

| Severity Level | Definition | Response SLA | Escalation Target |
|---|---|---|---|
| **SEV-1 (Critical)** | Unauthorized tool execution, prompt injection compromise of policy, unauthorized location leak, or unintended emergency trigger. | **< 15 minutes** | Solution Architect, Technical Lead, Security Lead |
| **SEV-2 (High)** | Policy Engine failure causing denial-of-service to core accessibility commands; contact alias data corruption; recurring STT misclassification rate > 10%. | **< 1 hour** | Backend Engineer, Mobile Engineer |
| **SEV-3 (Medium)** | TalkBack accessibility focus glitches, non-speech earcon failure, transient database latency spikes. | **< 4 hours** | QA/Accessibility Engineer |
| **SEV-4 (Low)** | Minor cosmetic UI flaws on screen curtain, non-critical telemetry logging inconsistencies. | **Next Sprint** | Engineering Team |

---

## 2. Emergency Kill-Switch & Circuit Breakers

Sanad includes automated and manual circuit breakers:

1. **Global Capability Kill-Switch:**
   The backend configuration supports instant deactivation of any capability via environment variable or administrative API without redeploying code:
   ```bash
   KILL_SWITCH_CAP_TELEPHONY=DISABLED
   KILL_SWITCH_CAP_MESSAGING=DISABLED
   ```
2. **Client-Side Panic Reset:**
   A long-press on device volume buttons or verbal command *"إلغاء الطوارئ"* forces the client into offline safe mode, dropping all active tokens and halting ongoing network requests.

---

## 3. Incident Response Lifecycle

```text
  [1. Detection] ──► [2. Containment] ──► [3. Eradication] ──► [4. Recovery] ──► [5. Post-Mortem]
```

1. **Detection:**
   - Automated Prometheus alerts on elevated `POLICY_ERR_` spikes ($> 5\%$ of traffic).
   - Tamper-detection signals from Android clients (e.g., failed HMAC verifications).
   - User or caregiver reports via support channel.
2. **Containment:**
   - Immediate activation of capability kill-switch for the affected domain.
   - Revocation of active JWT session tokens and ephemeral HMAC signing keys.
3. **Eradication & Root Cause:**
   - Analyze append-only audit logs to isolate the exact intent, policy evaluation, and nonce.
   - Patch deterministic policy logic or update dialect normalization filters.
4. **Recovery:**
   - Deploy verified patch.
   - Execute negative security regression suite before re-enabling capability flag.
5. **Post-Mortem:**
   - Publish internal Blameless Post-Mortem within 48 hours detailing root cause, timeline, and permanent architectural preventative actions.
