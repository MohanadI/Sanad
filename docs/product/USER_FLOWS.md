# Sanad User Interaction Flows & Accessibility Design

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Classification:** Accessibility & Product UX Specification  

---

## 1. Voice-First & Screen-Reader Accessibility Principles

Sanad is designed for blind users who navigate smartphones without sight. The interaction model is strictly governed by four accessibility principles:

1. **Audio Redundancy & Non-Speech Cues ("Earcons"):** Every state change (listening, thinking, challenging, success, failure) is signaled by a distinct, pleasant auditory earcon sound cue. Users should never be left in silence wondering if the app is waiting or frozen.
2. **Concise Spoken Responses:** Text-to-Speech (TTS) responses must be brief, direct, and free of visual metaphors ("اضغط على الزر" is forbidden; use "قل نعم أو لا").
3. **Immediate Interruptibility:** The user must be able to cancel, mute, or override ongoing speech at any microsecond via verbal commands ("وقف", "إلغي") or simple single-finger double-tap gestures.
4. **TalkBack Semantic Alignment:** All active screen elements are exposed via Android Accessibility APIs with appropriate roles (`button`, `alert`), live regions (`accessibilityLiveRegion="polite"` or `"assertive"`), and descriptive accessibility labels in Arabic.

---

## 2. Standard Earcon Audio Cues

| Earcon Code | Sound Profile | Meaning to User |
|---|---|---|
| `EARCON_LISTENING_START` | Rising chime (440Hz -> 880Hz, 80ms) | Microphones active; user may speak now. |
| `EARCON_THINKING` | Subtle low rhythmic pulse | System processing intent; please wait. |
| `EARCON_CONFIRM_CHALLENGE` | Two-tone inquiry bell | System requires verbal or tactile confirmation. |
| `EARCON_SUCCESS` | Harmonic major chord chime | Action authorized and successfully executed. |
| `EARCON_CANCELLED` | Descending soft tone (600Hz -> 300Hz) | Action aborted; system returned to standby. |
| `EARCON_ERROR` | Low warning chime | Request denied, unrecognized, or network failure. |

---

## 3. Core Interaction Flows

```text
               +-------------------------------------------+
               | User Double-Taps or Utters Wake Trigger   |
               +---------------------+---------------------+
                                     |
                                     v
                        [EARCON_LISTENING_START]
                                     |
                                     v
               +-------------------------------------------+
               | User Speaks Request in Palestinian Arabic |
               +---------------------+---------------------+
                                     |
                                     v
                           [EARCON_THINKING]
                                     |
                                     v
                         +-----------------------+
                         | Intent Interpretation |
                         +-----------+-----------+
                                     |
                                     v
                         +-----------------------+
                         | Policy Engine Check   |
                         +-----------+-----------+
                                     |
              +----------------------+----------------------+
              |                      |                      |
              v [LOW RISK]           v [HIGH RISK]          v [DENIED / GATED]
        +------------+         +-------------+        +------------+
        | Execute    |         | Challenge   |        | Reject     |
        | Immediate  |         | Confirmation|        | with Audio |
        +-----+------+         +------+------+        +-----+------+
              |                       |                     |
              v                       v                     v
      [EARCON_SUCCESS]       [EARCON_CONFIRM]         [EARCON_ERROR]
```

---

### Flow 1: Assistant Status & Help Query (`LOW` Risk)

*User Scenario: The user wants to verify system status and check the current time.*

1. **User Action:** Double-taps screen or opens app.
2. **System:** Plays `EARCON_LISTENING_START`. Screen curtain active (black display).
3. **User Speaks:** *"مرحبا سند، قديش الساعة وشو حالة التطبيق؟"*
4. **System:** Plays `EARCON_THINKING`.
5. **Intent Engine:** Extracts `INTENT_ASSISTANT_QUERY` with slot `queryType: "TIME_AND_STATUS"`.
6. **Policy Engine:** Evaluates `CAP_ASSISTANT_QUERY` $\longrightarrow$ Status: `ALLOWED` (Low Risk).
7. **System Spoken Response (TTS):** *"الساعة الآن التاسعة وثلاثون دقيقة صباحاً. سند متصل بالنظام وجاهز لمساعدتك."*
8. **System:** Plays `EARCON_SUCCESS`. Returns to passive standby.

---

### Flow 2: Contact Alias Registration (`LOW` Risk, Confirmation on Overwrite)

*User Scenario: The user wants to assign the nickname "مرتي" (my wife) to contact "هدى".*

1. **User Speaks:** *"سند، احفظ مرتي كـ هدى"*
2. **System:** Plays `EARCON_THINKING`.
3. **Intent Engine:** Extracts `INTENT_ALIAS_SET` with slots:
   - `aliasName: "مرتي"`
   - `targetContactName: "هدى"`
4. **Policy Engine:**
   - Checks if alias "مرتي" already exists. (Case A: New alias $\longrightarrow$ `ALLOWED`; Case B: Existing alias $\longrightarrow$ `CONFIRMATION_REQUIRED`).
   - Here, new alias $\longrightarrow$ `ALLOWED`.
5. **Tool Execution:** `TOOL_ALIAS_REGISTER` records the mapping.
6. **System Spoken Response:** *"تم حفظ اللقب مرتي لجهة الاتصال هدى بنجاح."*
7. **System:** Plays `EARCON_SUCCESS`.

---

### Flow 3: Action Challenge & Confirmation Loop (`HIGH` Risk Action Simulation)

*User Scenario: The user attempts an action requiring explicit confirmation.*

1. **User Speaks:** *"احذف كل الألقاب المحفوظة"* (Delete all saved aliases).
2. **System:** Plays `EARCON_THINKING`.
3. **Intent Engine:** Extracts `INTENT_ALIAS_CLEAR_ALL`.
4. **Policy Engine:** Evaluates capability $\longrightarrow$ Risk: `HIGH`. Emits HMAC-signed `confirmationToken`.
5. **System:** Plays `EARCON_CONFIRM_CHALLENGE`.
6. **System Spoken Prompt:** *"هل تريد بالتأكيد حذف جميع الألقاب المسجلة لديك؟ قل نعم للمتابعة أو لا للإلغاء."*
7. **User Speaks:** *"نعم، متأكد"* (Yes, sure).
8. **Confirmation Endpoint:** Ingests user response $\longrightarrow$ Resolves to `AFFIRMATIVE`. Validates token nonce.
9. **Tool Execution:** Executes bounded purge.
10. **System Spoken Response:** *"تم حذف جميع الألقاب كما طلبت."*
11. **System:** Plays `EARCON_SUCCESS`.

---

### Flow 4: Ambiguity & Disambiguation Flow

*User Scenario: User refers to a common name where multiple matches exist in contacts.*

1. **User Speaks:** *"بدي ارسل رسالة لأحمد"* (Gated capability simulation or contact lookup).
2. **System:** Plays `EARCON_THINKING`.
3. **Contact Lookup Tool:** Finds two matching contacts: "أحمد النجار" and "أحمد خليل".
4. **System Spoken Prompt:** *"وجدت أكثر من جهة اتصال باسم أحمد: أحمد النجار، وأحمد خليل. أيهما تقصد؟"*
5. **User Speaks:** *"أحمد النجار"*
6. **System:** Resolves target contact unequivocally to ID `cnt_ahmad_najjar`.

---

### Flow 5: Policy Rejection of Gated Capability

*User Scenario: The user asks the assistant to place a telephone call while telephony is gated/disabled.*

1. **User Speaks:** *"رن على أخوي"* (Call my brother).
2. **System:** Plays `EARCON_THINKING`.
3. **Intent Engine:** Extracts `INTENT_CONTACT_CALL` targeting `CAP_CONTACT_CALL`.
4. **Policy Engine:**
   - Evaluates `CAPABILITY_CONFIG['CAP_CONTACT_CALL'].enabled`.
   - Result: `false` (Capability Gated).
   - Returns: `status: DENIED`, code: `POLICY_ERR_CAPABILITY_DISABLED`.
5. **System:** Plays `EARCON_ERROR`.
6. **System Spoken Explanation (TTS):** *"خاصية إجراء المكالمات الهاتفية غير مفعلة حالياً في هذه النسخة التجريبية حفاظاً على أمانك."*
7. **Audit Event:** Records policy denial event `AUDIT_EVT_GATED_CALL_REJECTED`.

---

### Flow 6: Instant Verbal Cancellation

*User Scenario: During any speech prompt or thinking phase, user decides to abort.*

1. **System:** Begins speaking a confirmation prompt: *"هل تريد بالتأكيد..."*
2. **User Speaks:** *"وقف"* (Stop) or *"إلغي"* (Cancel).
3. **Audio Capture Engine:** Immediate hardware/VAD interrupt. Audio playback cuts off instantly ($< 50\text{ ms}$).
4. **System:** Plays `EARCON_CANCELLED`.
5. **Policy / Session State:** Current confirmation challenge token is immediately revoked. System returns to idle state.
