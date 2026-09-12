import {
  type AssistantInterpretRequest,
  type AssistantInterpretResponse,
  type StructuredActionCandidate,
  StructuredActionCandidateSchema,
  validateIntentSlots,
  generateCandidateToken,
  INTENTS,
  INTENT_CAPABILITY_MAP,
  CAPABILITY_CONFIG,
} from '@sanad/common';
import { normalizeArabicUtterance } from './normalizer.js';
import type { IntentClassifier } from './types.js';

export class DeterministicIntentClassifier implements IntentClassifier {
  async classify(request: AssistantInterpretRequest): Promise<StructuredActionCandidate> {
    const raw = request.text;
    const normalized = normalizeArabicUtterance(raw);

    const candidate = this.matchUtterance(normalized, raw);

    // Strict schema validation as mandated by the security kernel
    const validatedCandidate = StructuredActionCandidateSchema.parse(candidate);
    validateIntentSlots(validatedCandidate.intentId, validatedCandidate.slots);

    return validatedCandidate;
  }

  async interpret(
    request: AssistantInterpretRequest,
    secretKey?: string
  ): Promise<AssistantInterpretResponse> {
    const candidate = await this.classify(request);
    const secret = secretKey || process.env.SANAD_POLICY_SECRET || 'sanad-dev-ephemeral-secret-key-32b';
    const { token } = generateCandidateToken(
      secret,
      candidate.intentId,
      candidate.targetCapability,
      candidate.slots as Record<string, unknown>
    );

    return {
      success: true,
      candidateToken: token,
      actionCandidate: candidate,
      explanationArabic: this.explainCandidate(candidate),
    };
  }

  private matchUtterance(normalized: string, raw: string): StructuredActionCandidate {
    // 1. FAST-PATH: Cancellation & Silence (Highest Priority safety override)
    // Matches: "وقف", "إلغي", "الغي", "بلاش", "اسكت", "فكك", "ولا اشي", "ارجع", "كافي", "خلاص"
    const cancelPattern = /^(وقف|الغي|إلغي|بلاش|اسكت|فكك|ولا اشي|ارجع|كافي|خلاص)$/;
    if (cancelPattern.test(normalized)) {
      return {
        intentId: INTENTS.INTENT_ACTION_CANCEL,
        targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_ACTION_CANCEL],
        confidence: 0.99,
        slots: {},
        requiresConfirmation: false,
        rawUtteranceSanitized: normalized,
      };
    }

    // 2. Confirmation Affirmatives
    // Matches: "نعم", "اه", "ايوا", "ماشي", "تمام", "موافق", "اكيد", "توكل على الله", "يلا", "صحيح"
    const confirmPattern = /^(نعم|اه|ايوا|ماشي|تمام|موافق|اكيد|توكل عل[يى] الله|يلا|صحيح)$/;
    if (confirmPattern.test(normalized)) {
      return {
        intentId: INTENTS.INTENT_ACTION_CONFIRM,
        targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_ACTION_CONFIRM],
        confidence: 0.95,
        slots: { response: 'AFFIRMATIVE' },
        requiresConfirmation: false,
        rawUtteranceSanitized: normalized,
      };
    }

    // 3. Emergency Trigger (Safety distress words) -> Gated in Policy Engine
    const emergencyPattern = /(طوارئ|النجده|اسعاف|انقذوني|ساعدوني)/;
    if (emergencyPattern.test(normalized)) {
      return {
        intentId: INTENTS.INTENT_EMERGENCY_TRIGGER,
        targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_EMERGENCY_TRIGGER],
        confidence: 0.98,
        slots: {},
        requiresConfirmation: true,
        rawUtteranceSanitized: normalized,
      };
    }

    // 4. Core Assistant Queries (Call Log, Battery, Time, Help, Status)
    if (/(مين رن|مين اتصل|مكالمات|سجل المكالمات)/.test(normalized)) {
      return {
        intentId: INTENTS.INTENT_ASSISTANT_QUERY,
        targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_ASSISTANT_QUERY],
        confidence: 0.91,
        slots: { queryType: 'CALL_LOG_STATUS' },
        requiresConfirmation: false,
        rawUtteranceSanitized: normalized,
      };
    }

    if (/(ساعه|الوقت|تاريخ|شو اليوم|تاريخ اليوم|اي يوم)/.test(normalized)) {
      return {
        intentId: INTENTS.INTENT_ASSISTANT_QUERY,
        targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_ASSISTANT_QUERY],
        confidence: 0.92,
        slots: { queryType: 'TIME_DATE' },
        requiresConfirmation: false,
        rawUtteranceSanitized: normalized,
      };
    }

    if (/(بطاريه|شحن|طاقه)/.test(normalized)) {
      return {
        intentId: INTENTS.INTENT_ASSISTANT_QUERY,
        targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_ASSISTANT_QUERY],
        confidence: 0.92,
        slots: { queryType: 'BATTERY_STATUS' },
        requiresConfirmation: false,
        rawUtteranceSanitized: normalized,
      };
    }

    if (/(مساعده|تعليمات|شو بتعمل|مين انت|كيف استعمل|شرح)/.test(normalized)) {
      return {
        intentId: INTENTS.INTENT_ASSISTANT_QUERY,
        targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_ASSISTANT_QUERY],
        confidence: 0.95,
        slots: { queryType: 'HELP' },
        requiresConfirmation: false,
        rawUtteranceSanitized: normalized,
      };
    }

    if (/(حاله النظام|الوضع|فحص)/.test(normalized)) {
      return {
        intentId: INTENTS.INTENT_ASSISTANT_QUERY,
        targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_ASSISTANT_QUERY],
        confidence: 0.9,
        slots: { queryType: 'SYSTEM_STATUS' },
        requiresConfirmation: false,
        rawUtteranceSanitized: normalized,
      };
    }

    // 5. Contact Alias Management
    // List aliases
    if (/(مين في القائمه|عرض الاسماء|قائمه الالقاب|شو عندي القاب|الالقاب)/.test(normalized)) {
      return {
        intentId: INTENTS.INTENT_ALIAS_LIST,
        targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_ALIAS_LIST],
        confidence: 0.88,
        slots: {},
        requiresConfirmation: false,
        rawUtteranceSanitized: normalized,
      };
    }

    // Delete alias: e.g. "احذف اللقب مرتي"
    const aliasDeleteMatch = normalized.match(/(?:احذف|شيل|امسح|حذف)\s+(?:اللقب\s+)?([^\s]+)/);
    if (aliasDeleteMatch && aliasDeleteMatch[1]) {
      return {
        intentId: INTENTS.INTENT_ALIAS_DELETE,
        targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_ALIAS_DELETE],
        confidence: 0.89,
        slots: { aliasName: aliasDeleteMatch[1] },
        requiresConfirmation: true,
        rawUtteranceSanitized: normalized,
      };
    }

    // Set alias: e.g. "سمي هدى مرتي" or "حط لقب مرتي ل هدى"
    const aliasSetMatch1 = normalized.match(/سمي\s+([^\s]+)\s+([^\s]+)/);
    if (aliasSetMatch1 && aliasSetMatch1[1] && aliasSetMatch1[2]) {
      return {
        intentId: INTENTS.INTENT_ALIAS_SET,
        targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_ALIAS_SET],
        confidence: 0.88,
        slots: {
          targetContact: aliasSetMatch1[1],
          aliasName: aliasSetMatch1[2],
        },
        requiresConfirmation: false,
        rawUtteranceSanitized: normalized,
      };
    }

    const aliasSetMatch2 = normalized.match(/(?:حط|سجل|ضيف)\s+لقب\s+([^\s]+)\s+ل\s*([^\s]+)/);
    if (aliasSetMatch2 && aliasSetMatch2[1] && aliasSetMatch2[2]) {
      return {
        intentId: INTENTS.INTENT_ALIAS_SET,
        targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_ALIAS_SET],
        confidence: 0.88,
        slots: {
          aliasName: aliasSetMatch2[1],
          targetContact: aliasSetMatch2[2],
        },
        requiresConfirmation: false,
        rawUtteranceSanitized: normalized,
      };
    }

    // 6. Gated Capabilities (Accurately recognized and dispatched to Policy Engine for safe gating)
    // Calling: "رن على مرتي", "اتصل ب هدى", "دق على احمد", "تلفن ل محمود"
    const callMatch = normalized.match(/(?:رن عل[يى]|اتصل ب|دق عل[يى]|تلفن ل|ودي اتصال ل)\s+(.+)/);
    if (callMatch && callMatch[1]) {
      const contact = callMatch[1].trim();
      return {
        intentId: INTENTS.INTENT_CONTACT_CALL,
        targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_CONTACT_CALL],
        confidence: 0.92,
        slots: { targetContact: contact },
        requiresConfirmation: CAPABILITY_CONFIG.CAP_CONTACT_CALL.defaultRequiresConfirmation,
        rawUtteranceSanitized: normalized,
      };
    }

    // Messaging: "ابعت رسالة ل مرتي بنص جاي هلأ"
    const messageMatch = normalized.match(/(?:ابعت رساله ل|ارسل مسج ل|رساله ل)\s+([^\s]+)(?:\s+(?:بنص|نص)?\s*(.+))?/);
    if (messageMatch && messageMatch[1]) {
      return {
        intentId: INTENTS.INTENT_MESSAGE_SEND,
        targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_MESSAGE_SEND],
        confidence: 0.91,
        slots: {
          targetContact: messageMatch[1],
          body: messageMatch[2]?.trim() || 'رسالة افتراضية',
        },
        requiresConfirmation: CAPABILITY_CONFIG.CAP_MESSAGE_SEND.defaultRequiresConfirmation,
        rawUtteranceSanitized: normalized,
      };
    }

    // Location Query: "وين انا", "شو مكاني", "موقعي"
    if (/(وين انا|شو مكاني|موقعي الحالي|وين مكاني)/.test(normalized)) {
      return {
        intentId: INTENTS.INTENT_LOCATION_QUERY,
        targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_LOCATION_QUERY],
        confidence: 0.9,
        slots: { detailLevel: 'DETAILED' },
        requiresConfirmation: CAPABILITY_CONFIG.CAP_LOCATION_READ.defaultRequiresConfirmation,
        rawUtteranceSanitized: normalized,
      };
    }

    // Location Share: "شارك موقعي مع احمد"
    const locationShareMatch = normalized.match(/(?:شارك موقعي مع|ابعت موقعي ل|شارك مكاني مع)\s+(.+)/);
    if (locationShareMatch && locationShareMatch[1]) {
      return {
        intentId: INTENTS.INTENT_LOCATION_SHARE,
        targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_LOCATION_SHARE],
        confidence: 0.9,
        slots: { targetContact: locationShareMatch[1].trim() },
        requiresConfirmation: CAPABILITY_CONFIG.CAP_LOCATION_SHARE.defaultRequiresConfirmation,
        rawUtteranceSanitized: normalized,
      };
    }

    // Calendar Query: "شو عندي مواعيد"
    if (/(شو عندي مواعيد|مواعيدي اليوم|جدولي اليوم|المواعيد)/.test(normalized)) {
      return {
        intentId: INTENTS.INTENT_CALENDAR_QUERY,
        targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_CALENDAR_QUERY],
        confidence: 0.89,
        slots: { timeRange: 'TODAY' },
        requiresConfirmation: CAPABILITY_CONFIG.CAP_CALENDAR_READ.defaultRequiresConfirmation,
        rawUtteranceSanitized: normalized,
      };
    }

    // Fallback: Unrecognized
    return {
      intentId: INTENTS.INTENT_UNRECOGNIZED,
      targetCapability: INTENT_CAPABILITY_MAP[INTENTS.INTENT_UNRECOGNIZED],
      confidence: 0.1,
      slots: { rawUtterance: raw.slice(0, 500) },
      requiresConfirmation: false,
      rawUtteranceSanitized: normalized,
    };
  }

  private explainCandidate(candidate: StructuredActionCandidate): string {
    switch (candidate.intentId) {
      case INTENTS.INTENT_ACTION_CANCEL:
        return 'طلب إلغاء العملية الحالية';
      case INTENTS.INTENT_ACTION_CONFIRM:
        return 'تأكيد العملية السابقة';
      case INTENTS.INTENT_ASSISTANT_QUERY:
        return 'طلب استعلام من المساعد الصوتي';
      case INTENTS.INTENT_ALIAS_LIST:
        return 'عرض قائمة جهات الاتصال والألقاب المسجلة';
      case INTENTS.INTENT_ALIAS_SET:
        return 'تسجيل لقب لجهة اتصال';
      case INTENTS.INTENT_ALIAS_DELETE:
        return 'حذف لقب جهة اتصال';
      case INTENTS.INTENT_CONTACT_CALL:
        return 'طلب إجراء مكالمة هاتفية';
      case INTENTS.INTENT_MESSAGE_SEND:
        return 'طلب إرسال رسالة نصية';
      case INTENTS.INTENT_LOCATION_QUERY:
      case INTENTS.INTENT_LOCATION_SHARE:
        return 'طلب مرتبط بالموقع الجغرافي';
      case INTENTS.INTENT_CALENDAR_QUERY:
      case INTENTS.INTENT_CALENDAR_CREATE:
        return 'طلب مرتبط بالتقويم والمواعيد';
      case INTENTS.INTENT_EMERGENCY_TRIGGER:
        return 'تفعيل نداء الطوارئ';
      default:
        return 'لم أتمكن من فهم طلبك بوضوح';
    }
  }
}
