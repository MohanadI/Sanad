# Sanad Palestinian Arabic Intent & Linguistic Taxonomy

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Classification:** NLP & Linguistic Specification  

---

## 1. Linguistic Foundation & Palestinian Dialect Topology

Standard Modern Arabic (Fusha) voice assistants fail consistently when deployed with Palestinian users because daily conversational commands rely heavily on regional Levantine/Palestinian dialect (*Lahjeh Falastiniyeh*).

Sanad's Intent Classification Engine is purpose-built to recognize and normalize the three primary sub-dialects of Palestine:

```text
                           Palestinian Arabic (اللهجة الفلسطينية)
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
        ▼                                ▼                                ▼
  Urban (Madani - مدني)            Rural (Fellahi - فلاحي)          Bedouin (Badawi - بدوي)
  - Jerusalem, Ramallah, Nablus    - West Bank & Gaza villages     - Southern Gaza, Naqab, Valley
  - Qaf (ق) -> Hamza (ء):          - Qaf (ق) -> Kaf (ك):           - Qaf (ق) -> Ga (گ):
    "قال" -> "آل"                    "قال" -> "كال"                   "قال" -> "گال"
  - Kaf (ك) -> K                   - Kaf (ك) -> Ch (تش):           - Kaf (ك) -> K / Ch
    "كيفك" -> "كيفك"                 "كيفك" -> "تشيفك"                "كيفك" -> "كيفك / تشيفك"
```

### Key Regional Lexical Markers
- **Temporal expressions:**
  - *"هلقيت"* / *"هسا"* / *"إسا"* $\longrightarrow$ Now / Immediately.
  - *"بكره"* $\longrightarrow$ Tomorrow.
  - *"كمان شوي"* $\longrightarrow$ In a little bit.
  - *"إمبارح"* $\longrightarrow$ Yesterday.
- **Negation & Rejection:**
  - *"بديش"* / *"بديشي"* $\longrightarrow$ I don't want.
  - *"بلاش"* / *"فكك"* / *"إلغي"* $\longrightarrow$ Never mind / Cancel.

---

## 2. Intent Taxonomy & Slot Specifications

Every recognized user utterance maps to a strongly typed `StructuredAction` containing a canonical `intentId` and typed slots.

| Intent Identifier | Target Capability | Description | Mandatory Slots | Optional Slots | Confidence Threshold |
|---|---|---|---|---|---|
| `INTENT_ASSISTANT_QUERY` | `CAP_ASSISTANT_QUERY` | Help, system status, time, battery inquiries. | `queryType` | `topic` | 0.80 |
| `INTENT_ALIAS_SET` | `CAP_ALIAS_MANAGE` | Assign a kinship or nickname to a contact. | `aliasName`, `targetContact`| None | 0.85 |
| `INTENT_ALIAS_LIST` | `CAP_ALIAS_MANAGE` | List all configured nicknames. | None | None | 0.80 |
| `INTENT_ALIAS_DELETE` | `CAP_ALIAS_MANAGE` | Remove an existing alias. | `aliasName` | None | 0.88 |
| `INTENT_ACTION_CONFIRM` | `CAP_ACTION_CANCEL` | Affirmative response to an active challenge. | `response` | None | 0.90 |
| `INTENT_ACTION_CANCEL` | `CAP_ACTION_CANCEL` | Abort active challenge or silence speech. | None | None | **0.75 (Fast-path)** |
| `INTENT_CONTACT_CALL` *(Gated)* | `CAP_CONTACT_CALL` | Initiate phone call to contact or alias. | `targetContact` | `phoneType` | 0.90 |
| `INTENT_MESSAGE_SEND` *(Gated)* | `CAP_MESSAGE_SEND` | Send SMS text message. | `targetContact`, `body` | None | 0.92 |
| `INTENT_LOCATION_QUERY` *(Gated)* | `CAP_LOCATION_READ` | Inquire current whereabouts. | None | `detailLevel` | 0.85 |
| `INTENT_LOCATION_SHARE` *(Gated)* | `CAP_LOCATION_SHARE`| Share location with contact. | `targetContact` | `duration` | 0.90 |
| `INTENT_CALENDAR_QUERY` *(Gated)* | `CAP_CALENDAR_READ` | Query appointments on agenda. | `timeRange` | None | 0.85 |
| `INTENT_CALENDAR_CREATE` *(Gated)*| `CAP_CALENDAR_WRITE`| Schedule new calendar event. | `eventTitle`, `startTime`| `duration` | 0.90 |
| `INTENT_EMERGENCY_TRIGGER` *(Gated)*| `CAP_EMERGENCY_TRIGGER`| Critical distress emergency trigger. | None | None | **0.95 (High Bar)** |

---

## 3. Utterance Equivalence Sets (Palestinian Dialect)

The intent classifier maps disparate colloquial phrasings into identical canonical actions:

### Set 1: Calling Verbs (Gated Capability)
All map to `INTENT_CONTACT_CALL`:
- *"رن على مرتي"* (Urban/General)
- *"دق على مرتي"* (Rural West Bank)
- *"تلفن لمرتي"* (Urban)
- *"عطيه رنة لأحمد"* (Colloquial idiom)
- *"اتصل بزوجتي"* (Modern Standard)
- *"ودّي اتصال لأبوي"* (Gazan colloquial)

### Set 2: Kinship Aliases & Social Titles
Normalized to canonical semantic tokens:
- **Wife:** *"مرتي"*, *"زوجتي"*, *"المدام"*, *"أم العيال"*, *"المرة"*
- **Husband:** *"جوزي"*, *"زوجي"*, *"الزلمة"*, *"أبو العيال"*
- **Father:** *"أبوي"*, *"يابا"*, *"الوالد"*, *"الحج"*
- **Mother:** *"إمي"*, *"يما"*, *"الوالدة"*, *"الحجة"*
- **Brother / Sister:** *"أخوي"*, *"خيا"*, *"سيدي"*, *"أختي"*, *"خيتي"*
- **Grandparents:** *"سيدي"*, *"ستّي"*
- **Professional:** *"الدكتور"*, *"الحكيم"*, *"الشيخ"*, *"الأستاذ"*

### Set 3: Affirmatives (Confirmation Vocabulary)
Must resolve to `AFFIRMATIVE`:
- *"نعم"*, *"آه"*, *"أيوا"*, *"ماشي"*, *"تمام"*, *"موافق"*, *"أكيد"*, *"توكل على الله"*, *"يلا"*, *"صحيح"*

### Set 4: Negatives & Cancellations (Abort Vocabulary)
Must resolve to `NEGATIVE` or `CANCEL`:
- *"لا"*, *"لأ"*, *"بلاش"*, *"أوعك"*, *"إلغي"*, *"وقف"*, *"اسكت"*, *"فكك"*, *"ولا إشي"*, *"ارجع"*

---

## 4. Phonetic & Normalization Preprocessing Pipeline

Before lexical matching or language model ingestion, the raw Arabic transcript is passed through a deterministic normalization pipeline (`backend/packages/intent-classifier/normalizer.ts`):

```typescript
export function normalizeArabicUtterance(raw: string): string {
  return raw
    // 1. Strip Arabic diacritics (Harakat: Fatha, Damma, Kasra, Sukun, Shadda)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // 2. Normalize Alef variations (أ, إ, آ -> ا)
    .replace(/[أإآ]/g, 'ا')
    // 3. Normalize Taa Marbuta (ة -> ه)
    .replace(/ة/g, 'ه')
    // 4. Normalize Yaa (ى -> ي)
    .replace(/ى/g, 'ي')
    // 5. Strip punctuation and excessive whitespace
    .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
```

---

## 5. Intent Evaluation Corpus & Benchmark Requirements

The Intent Classifier must be evaluated against a verified ground-truth test corpus of **500+ curated Palestinian dialect utterances** before any pilot release.

### Minimum Acceptance Thresholds:
1. **Overall Intent Accuracy:** $\ge 90.0\%$ across all 500 test samples.
2. **Cancellation Fast-Path Detection:** $\ge 98.0\%$ precision on abort keywords ("وقف", "إلغي").
3. **Zero False Positives on Gated Capabilities:** Any utterance mapped to a gated capability must be correctly routed to the Policy Engine gate and never silently executed.
4. **Disambiguation Rate:** If confidence is between $0.60$ and $0.80$, the system must explicitly enter a disambiguation loop rather than guessing.
