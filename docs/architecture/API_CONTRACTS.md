# Sanad API Contracts & Interface Specifications

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Classification:** Internal Technical Architecture  

---

## 1. Overview & Protocol Standards

The Sanad platform exposes a RESTful JSON API over HTTPS with WebSocket streaming support for real-time conversational audio interactions.

- **Base URL:** `https://api.sanad.local/v1` (MVP self-hosted environment)
- **Transport Security:** TLS 1.3 mandatory.
- **Authentication:** Bearer JWT in the `Authorization` header (`Bearer <token>`).
- **Content Type:** `application/json; charset=utf-8`
- **Validation Engine:** All ingress and egress payloads must conform to Zod schemas. Any request with undeclared fields is rejected with `400 Bad Request`.

---

## 2. Intent Interpretation Endpoint

### `POST /v1/assistant/interpret`
Converts spoken or transcribed user utterances into a validated `StructuredActionCandidate`.

#### Request Payload
```json
{
  "sessionId": "sess_98765432-1234-5678-9abc-def012345678",
  "text": "بدي اعرف مين رن علي اليوم",
  "dialectLocale": "ar-PS-WestBank",
  "clientTimestamp": "2026-09-12T09:30:00.000Z",
  "inputModality": "VOICE_STT"
}
```

#### TypeScript Schema
```typescript
export interface AssistantInterpretRequest {
  sessionId: string;
  text: string;
  dialectLocale: 'ar-PS-Gaza' | 'ar-PS-WestBank' | 'ar-PS-Jerusalem' | 'ar-STANDARD';
  clientTimestamp: string;
  inputModality: 'VOICE_STT' | 'TEXT_TALKBACK';
}
```

#### Response Payload (Success `200 OK`)
```json
{
  "success": true,
  "candidateToken": "act_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "actionCandidate": {
    "intentId": "INTENT_ASSISTANT_QUERY",
    "targetCapability": "CAP_ASSISTANT_QUERY",
    "confidence": 0.94,
    "slots": {
      "queryType": "CALL_LOG_STATUS"
    },
    "requiresConfirmation": false,
    "rawUtteranceSanitized": "بدي اعرف مين رن علي اليوم"
  },
  "explanationArabic": "طلب استعلام عن سجل المكالمات"
}
```

---

## 3. Policy Evaluation Endpoint

### `POST /v1/policy/evaluate`
Takes a structured action candidate bound with a cryptographic `candidateToken` and deterministically computes authorization status and risk tier. In accordance with **ADR-004**, confirmation requirements are determined authoritatively by the Policy Engine, ignoring untrusted client confirmation claims.

#### Request Payload
```json
{
  "candidateToken": "act_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "action": {
    "intentId": "INTENT_ALIAS_SET",
    "targetCapability": "CAP_ALIAS_MANAGE",
    "slots": {
      "aliasName": "مرتي",
      "targetContactId": "cnt_550e8400-e29b-41d4-a716-446655440000"
    }
  },
  "deviceContext": {
    "deviceId": "dev_android_pixel7a_xyz",
    "appVersion": "1.0.0",
    "osPermissionsGranted": ["android.permission.READ_CONTACTS"]
  }
}
```

#### Response Payload: Allowed (`200 OK`)
```json
{
  "status": "ALLOWED",
  "riskTier": "LOW",
  "executionGrantToken": "gt_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-09-12T09:30:30.000Z"
}
```

#### Response Payload: Confirmation Required (`200 OK`)
```json
{
  "status": "CONFIRMATION_REQUIRED",
  "riskTier": "HIGH",
  "confirmationToken": "ct_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "arabicPrompt": "هل تريد ربط الاسم مرتي مع جهة الاتصال هدى؟ قل نعم للمتابعة أو لا للإلغاء.",
  "promptAudioCue": "EARCON_CONFIRMATION_CHALLENGE",
  "expiresAt": "2026-09-12T09:30:30.000Z"
}
```

#### Response Payload: Denied (`403 Forbidden` / `200 OK with DENIED`)
```json
{
  "status": "DENIED",
  "reasonCode": "POLICY_ERR_CAPABILITY_DISABLED",
  "arabicExplanation": "هذه الميزة غير مفعلة حالياً في النظام حفاظاً على أمانك.",
  "actionTaken": "REJECTED_AUDITED"
}
```

---

## 4. Confirmation Resolution Endpoint

### `POST /v1/policy/confirm`
Resolves an active confirmation challenge using the user's spoken or interactive answer.

#### Request Payload
```json
{
  "confirmationToken": "ct_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userResponse": "AFFIRMATIVE", 
  "responseTimestamp": "2026-09-12T09:30:08.000Z"
}
```

*Note: `userResponse` must be strictly typed: `'AFFIRMATIVE' | 'NEGATIVE' | 'CANCEL' | 'TIMEOUT'`.*

#### Response Payload (Confirmed `200 OK`)
```json
{
  "status": "CONFIRMED",
  "executionGrantToken": "gt_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-09-12T09:30:38.000Z"
}
```

#### Response Payload (Cancelled `200 OK`)
```json
{
  "status": "CANCELLED",
  "arabicMessage": "تم إلغاء العملية بناءً على طلبك.",
  "audioCue": "EARCON_ACTION_CANCELLED"
}
```

---

## 5. Bounded Tool Execution Endpoint

### `POST /v1/tools/execute`
Executes an authorized action. Only accepts requests carrying an unexpired, unconsumed `executionGrantToken`.
In accordance with **ADR-004**, the executor strictly asserts that:
$$\text{SHA-256}(\text{toolName} \,\|\, \text{canonical}(\text{parameters})) == \text{token.actionHash}$$
Any parameter mismatch or tampering aborts execution immediately with a security rejection.

#### Request Payload
```json
{
  "toolName": "TOOL_ALIAS_REGISTER",
  "executionGrantToken": "gt_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "parameters": {
    "aliasName": "مرتي",
    "contactId": "cnt_550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### Response Payload (Success `200 OK`)
```json
{
  "success": true,
  "resultData": {
    "aliasId": "als_11223344-5566-7788-99aa-bbccddeeff00",
    "registeredAlias": "مرتي",
    "contactId": "cnt_550e8400-e29b-41d4-a716-446655440000"
  },
  "feedbackArabic": "تم حفظ اللقب مرتي بنجاح.",
  "audioCue": "EARCON_ACTION_SUCCESS"
}
```

---

## 6. Contact Alias Management API

### `GET /v1/contacts/aliases`
Retrieves all configured contact aliases for the authenticated user. Per **ADR-006** (Sovereign Privacy), plaintext contact names are never stored on or emitted by the server; mappings link exclusively to client-managed pseudonymous UUIDs.

#### Response (`200 OK`)
```json
{
  "aliases": [
    {
      "id": "als_11223344",
      "alias": "مرتي",
      "contactId": "cnt_550e8400-e29b-41d4-a716-446655440000",
      "createdAt": "2026-09-12T09:00:00Z"
    },
    {
      "id": "als_99887766",
      "alias": "أخوي",
      "contactId": "cnt_661f9511-f30c-52e5-b827-557766551111",
      "createdAt": "2026-09-12T09:15:00Z"
    }
  ]
}
```

---

## 7. Standardized Error Response Schema

All non-200 HTTP responses follow a strict error contract:

```typescript
export interface SanadApiError {
  errorCode: string;
  statusCode: number;
  messageEnglish: string;
  messageArabic: string;
  timestamp: string;
  incidentId: string;
  isRecoverable: boolean;
}
```

### Example Error (`400 Bad Request`)
```json
{
  "errorCode": "ERR_VALIDATION_FAILED",
  "statusCode": 400,
  "messageEnglish": "Payload failed strict schema validation: missing property 'aliasName'",
  "messageArabic": "تعذر إكمال الطلب بسبب نقص في البيانات المدخلة.",
  "timestamp": "2026-09-12T09:30:00Z",
  "incidentId": "inc_abc12345",
  "isRecoverable": true
}
```
