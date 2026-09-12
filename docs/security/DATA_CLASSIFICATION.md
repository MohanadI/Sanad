# Sanad Data Classification & Privacy Lifecycle Policy

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Classification:** Security & Data Governance Specification  

---

## 1. Context & Geopolitical Privacy Threat in Palestine

Palestinian blind users face unique security and privacy threats. In addition to standard digital risks, users operate in an environment characterized by pervasive surveillance, electronic monitoring, and physical device inspection at military checkpoints. 

A digital assistant storing continuous GPS traces, contact graphs, call logs, or audio recordings represents an unacceptable life-safety risk to users. Therefore, Sanad enforces **radical data minimization**: *data that does not exist cannot be compromised, leaked, or coerced.*

---

## 2. Four-Tier Data Classification Taxonomy

All data processed, transmitted, or stored by Sanad is categorized into four distinct classification tiers:

```text
+-------------------------------------------------------------------------------+
| TIER 4: RESTRICTED / HIGHLY SENSITIVE (Life-Safety & Sovereign Privacy)       |
| - Precise GPS Coordinates   - Raw Voice Audio Recordings   - Phone Numbers     |
| - SMS Content Transcripts   - Emergency Contact Identities - Master Auth Keys |
+-------------------------------------------------------------------------------+
| TIER 3: CONFIDENTIAL / PII (User Identity & Persona)                          |
| - Contact Nickname Aliases  - Pseudonymized User IDs       - Device Metadata  |
| - Calendar Event Titles     - In-App Preference Toggles                       |
+-------------------------------------------------------------------------------+
| TIER 2: INTERNAL / OPERATIONAL (System Functionality)                         |
| - Intent Classification Dictionaries - Aggregated Anonymized Error Rates     |
| - Policy Rules Configuration         - System Latency Metrics                 |
+-------------------------------------------------------------------------------+
| TIER 1: PUBLIC (Open Documentation)                                           |
| - System Help Texts         - Open Source Codebase - Architecture Specs       |
| - Static Arabic Voice Guidance Phrases                                        |
+-------------------------------------------------------------------------------+
```

---

## 3. Data Handling, Encryption, & Retention Matrix

| Data Type | Classification Tier | Storage Location | Encryption at Rest | Encryption in Transit | Retention Period | Disposal / Destruction Method |
|---|---|---|---|---|---|---|
| **Raw Voice Audio** | `TIER 4 (Restricted)` | Client RAM only | N/A (Never written to disk) | TLS 1.3 (Streamed) | **0 seconds** (Destroyed immediately after STT conversion) | Overwritten in memory buffer |
| **Precise GPS (Lat/Long)**| `TIER 4 (Restricted)`| Client RAM only | N/A (Never persisted) | TLS 1.3 | **0 seconds** (Destroyed immediately after geocode lookup) | Zeroed out in memory |
| **Raw Phone Numbers** | `TIER 4 (Restricted)` | Native Address Book only | OS Native Sandbox | N/A | Kept only on native device | Never uploaded to Sanad backend |
| **Master Cryptographic Keys**| `TIER 4 (Restricted)`| Android KeyStore / HSM | AES-256-GCM hardware | Never transmitted | Rotated periodically | Revoked in Hardware KeyStore |
| **Contact Aliases** | `TIER 3 (Confidential)`| Encrypted SQLite / Postgres | AES-256-GCM | TLS 1.3 | Duration of account lifecycle | Cryptographic erasure on account reset |
| **User Profile / ID** | `TIER 3 (Confidential)`| PostgreSQL Backend | AES-256-GCM (Column-level) | TLS 1.3 | Active user lifetime | Anonymized / Hard deleted on request |
| **Audit Event Logs** | `TIER 3 (Confidential)`| PostgreSQL Append-Only | AES-256 (Disk volume) | TLS 1.3 | **90 days maximum** | Automated daily partition pruning |
| **Aggregated Metrics** | `TIER 2 (Internal)` | Prometheus / TimescaleDB | Standard block storage | TLS 1.3 | 12 months | Automated rollup / Downsampling |
| **Public Guidance Text** | `TIER 1 (Public)` | Static assets / GitHub | Public git repository | HTTPS | Indefinite | Standard Git version control |

---

## 4. Redaction, Masking, & Telemetry Guidelines

To ensure that backend logs and telemetry do not inadvertently capture sensitive user data, the following masking rules are hardcoded into the logging middleware (`backend/packages/common/logger.ts`):

1. **Phone Numbers:** Masked to show only country code and last 2 digits:
   $$\text{+972 59 912 3456} \longrightarrow \text{+972 59 *** **56}$$
2. **Contact Names:** Aliases are logged using internal hashed IDs:
   $$\text{"مرتي"} \longrightarrow \text{hash\_alias\_8f2b1a}$$
3. **Spoken Utterances in Audit Logs:**
   - Raw transcription text is stripped of any detected numeric digits (preventing accidental recording of credit card numbers, national IDs, or telephone numbers).
   - Only validated `intentId` and `targetCapability` are logged as structured enums.
4. **Zero Stack Trace Leaks:** User-facing error messages in Arabic never contain internal database schema names, server IP addresses, or file paths.

---

## 5. Right to Erasure & "Emergency Purge" Mode

Given the threat of physical device inspection, Sanad includes an accessible **Emergency Purge** protocol:
- Triggered by a dedicated spoken phrase or accessibility gesture pattern.
- Instantly clears local EncryptedSharedPreferences, deletes cached session tokens from Android KeyStore, and resets the app to an unconfigured initial state.
- Emits an asynchronous notification to revoke active backend session keys before wiping local credentials.
