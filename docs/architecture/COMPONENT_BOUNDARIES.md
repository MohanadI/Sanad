# Sanad Component Boundaries & Isolation Architecture

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Classification:** Internal Technical Architecture  

---

## 1. Architectural Purpose & Isolation Rationale

To maintain the core safety invariant (**"AI proposes, Policy authorizes, Tool executes"**), strict boundaries must be maintained between system components. In a Modular Monolith, code separation can easily deteriorate into tightly coupled spaghetti without formal structural enforcement.

This document defines:
1. Exact package and module boundaries.
2. Directional dependency rules (which package may import which).
3. Data boundaries and boundary translation objects.
4. Tool executor sandboxing.
5. Automated boundary enforcement mechanisms.

---

## 2. Monorepo & Package Architecture

The codebase is organized as a unified workspace with strictly demarcated package domains:

```text
Sanad/
├── mobile/                           # React Native Mobile Application (Android-first)
│   ├── src/
│   │   ├── accessibility/            # TalkBack bridges, screen reader announcements, earcons
│   │   ├── audio/                    # Native Audio capture, speech recognition wrappers
│   │   ├── client-policy/            # Client-side permission guards and confirmation UI
│   │   ├── network/                  # Gateway client, WebSocket transport, token management
│   │   └── storage/                  # Android Keystore encrypted preferences
│   └── android/                      # Native Android Kotlin/Java modules
│
├── backend/                          # Modular Monolith Backend (Node.js + TypeScript)
│   ├── packages/
│   │   ├── common/                   # Shared DTOs, Zod schemas, error types, contracts
│   │   ├── intent-classifier/        # Arabic NLP, dialect normalizer, structured action builder
│   │   ├── policy-engine/            # Deterministic RBAC/ABAC, risk tiering, confirmation state
│   │   ├── tool-executors/           # Bounded execution adapters (sandboxed side effects)
│   │   ├── alias-manager/            # Contact alias resolution and mapping
│   │   ├── audit-log/                # Append-only, zero-PII audit event persistence
│   │   └── api-gateway/              # Fastify HTTP/WS endpoints, auth verification, routing
│   └── infrastructure/               # Docker Compose, PostgreSQL migrations, config
│
├── ai-models/                        # Model artifacts, prompt definitions, dialect lexicons
└── testing/                          # Contract, security, accessibility, and E2E test suites
```

---

## 3. Dependency Matrix & Import Rules

A strict unidirectional dependency hierarchy is enforced across backend packages.

```text
      ┌────────────────┐
      │   api-gateway  │
      └───┬────────────┘
          │ (Orchestrates request lifecycle)
          ▼
      ┌────────────────┐
      │ intent-        │ ──[Produces Action]──┐
      │ classifier     │                      │
      └────────────────┘                      ▼
                                      ┌───────────────┐
                                      │ policy-engine │
                                      └───────┬───────┘
                                              │ (Produces AuthToken)
                                              ▼
                                      ┌───────────────┐
                                      │ tool-         │
                                      │ executors     │
                                      └───────┬───────┘
                                              │
                                              ▼
                                      ┌───────────────┐
                                      │   audit-log   │
                                      └───────────────┘
```

### Dependency Rules Table

| Package | May Import From | FORBIDDEN to Import From | Rationale |
|---|---|---|---|
| `common` | External utility libraries (e.g., Zod) | Any internal package | Must remain a pure leaf dependency. |
| `intent-classifier` | `common`, AI/NLP libraries | `policy-engine`, `tool-executors`, `audit-log`, `api-gateway` | **CRITICAL:** Generative AI must have zero awareness of policy rules or execution tools. |
| `policy-engine` | `common` | `intent-classifier`, `tool-executors`, AI libraries, DB directly | Policy logic must be 100% deterministic and free from AI side effects. |
| `tool-executors` | `common`, `audit-log` | `policy-engine`, `intent-classifier`, `api-gateway` | Executors must not grant themselves permissions or alter intent logic. |
| `alias-manager` | `common` | `tool-executors`, `intent-classifier` | Alias resolution is a pure data mapping lookup. |
| `audit-log` | `common`, DB drivers | All other packages | Audit log must be isolated and tamper-evident. |
| `api-gateway` | All packages | None (top-level orchestrator) | Responsible for wiring the pipeline in accordance with the security kernel. |

---

## 4. Boundary Translation & Data Contracts

Data passing across component boundaries must be transformed into immutable Data Transfer Objects (DTOs) validated by Zod schemas:

### Boundary 1: Client → API Gateway
- **Ingress Data:** Raw audio or pre-transcribed Arabic text + Session Auth Token + Device Metadata.
- **Contract:** `UserInteractionRequest`
- **Validation:** Gateway verifies JWT signature, validates rate limits, and strips any unknown query parameters.

### Boundary 2: API Gateway → Intent Classifier
- **Ingress Data:** Sanitized user text, user dialect locale (`ar-PS-Gaza`, `ar-PS-WestBank`, `ar-PS-Jerusalem`), active conversation context.
- **Egress Data:** `StructuredActionCandidate` containing:
  - `intentId`: String enum (e.g., `ASSISTANT_QUERY`, `ALIAS_SET`).
  - `confidenceScore`: Float $[0.0, 1.0]$.
  - `extractedSlots`: Strongly typed key-value pairs (e.g., `targetAlias`, `queryTopic`).
- **Security Check:** Output MUST pass `StructuredActionSchema.parse()`. If validation fails or confidence $< 0.80$, intent is flagged as `AMBIGUOUS` or `UNRECOGNIZED`.

### Boundary 3: Intent Classifier → Policy Engine
- **Ingress Data:** `StructuredActionCandidate` + Authenticated User Context (`userId`, `deviceTrustLevel`, `configuredPermissions`).
- **Egress Data:** `PolicyEvaluationResult` containing:
  - `decision`: `ALLOW` | `CONFIRMATION_REQUIRED` | `DENY`.
  - `riskTier`: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`.
  - `reasonCode`: Deterministic audit code (e.g., `POL_ALLOW_READONLY`, `POL_REQUIRE_AUDIO_CONFIRMATION`, `POL_DENY_CAPABILITY_DISABLED`).
  - `confirmationToken`: Ephemeral HMAC-SHA256 token (if confirmation required).
  - `localizedPromptArabic`: Structured template for client screen reader announcement.

### Boundary 4: Policy Engine → Tool Executors
- **Ingress Data:** `ExecutionRequest` containing:
  - `toolIdentifier`: Enum of bounded tools.
  - `sanitizedParameters`: Validated parameters (e.g., resolved internal contact ID, search query).
  - `authorizationGrant`: Cryptographically signed `ExecutionToken` verifying that Policy Engine approved the call.
- **Egress Data:** `ToolExecutionResult` containing:
  - `success`: Boolean.
  - `data`: Typed payload or error code.
  - `auditPayload`: Redacted telemetry data.

---

## 5. Tool Executor Sandboxing & Gating

Tool executors represent the real-world impact boundary. Each executor must conform to the following contract:

```typescript
export interface BoundedToolExecutor<TInput, TOutput> {
  readonly toolName: string;
  readonly requiredPermission: string;
  readonly isSensitive: boolean;

  execute(
    input: TInput,
    authGrant: ExecutionAuthToken
  ): Promise<ToolResult<TOutput>>;
}
```

### Sandbox Invariants
1. **Token Verification:** Every executor executes `verifyAuthToken(authGrant)` as its very first instruction. Execution aborts immediately if the token is invalid, expired, or tampered with.
2. **Execution Capability Gates:** Sensitive tool executors (Telephony, Messaging, Location, Calendar, Emergency) are wrapped in static capability feature gates:
   ```typescript
   if (FEATURE_FLAGS.CAPABILITY_TELEPHONY !== 'ENABLED') {
     throw new CapabilityDisabledError('TELEPHONY capability is inactive in current scope.');
   }
   ```
3. **No Inter-Tool Communication:** Tool A cannot call Tool B directly. All multi-step workflows must be orchestrated through the API Gateway and re-evaluated by the Policy Engine.

---

## 6. Automated Enforcement Mechanisms

To guarantee that these architectural boundaries are never violated during development, the project employs three layers of static automated enforcement:

1. **TypeScript Project References:** Backend packages use strict `tsconfig.json` paths with `composite: true`, preventing unauthorized cross-package imports at compile time.
2. **ESLint Boundary Plugin (`eslint-plugin-boundaries`):**
   - Configured with strict element types (`domain`, `policy`, `ai`, `tool`, `infrastructure`).
   - Any attempt by `intent-classifier` to import from `policy-engine` or `tool-executors` produces a blocking build error.
3. **Architecture Unit Tests (ArchUnit / Dependency Cruiser):**
   - Automated CI tests run `depcruise --config .dependency-cruiser.js src` on every pull request. Builds fail immediately if circular dependencies or forbidden imports are detected.
