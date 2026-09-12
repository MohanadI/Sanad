export const MESSAGE_KEYS = {
  // Policy Evaluation
  POLICY_CAPABILITY_DISABLED: 'policy.capability.disabled',
  POLICY_USER_CONSENT_MISSING: 'policy.user.consent_missing',
  POLICY_OS_PERMISSION_DENIED: 'policy.os.permission_denied',
  POLICY_CONFIRMATION_REQUIRED: 'policy.confirmation.required',
  POLICY_ALLOWED: 'policy.allowed',
  POLICY_DENIED_UNKNOWN: 'policy.denied.unknown',

  // Actions & Confirmations
  CONFIRM_CHALLENGE_DEFAULT: 'confirm.challenge.default',
  CONFIRM_ALIAS_SET: 'confirm.alias.set',
  CONFIRM_ALIAS_OVERWRITE: 'confirm.alias.overwrite',
  CONFIRM_ALIAS_DELETE: 'confirm.alias.delete',
  CONFIRM_CONTACT_CALL: 'confirm.contact.call',
  CONFIRM_MESSAGE_SEND: 'confirm.message.send',
  CONFIRM_LOCATION_SHARE: 'confirm.location.share',
  CONFIRM_CALENDAR_WRITE: 'confirm.calendar.write',
  CONFIRM_EMERGENCY_TRIGGER: 'confirm.emergency.trigger',

  ACTION_SUCCESS: 'action.success',
  ACTION_CANCELLED: 'action.cancelled',
  ACTION_CONFIRMED: 'action.confirmed',
  ACTION_TIMED_OUT: 'action.timed_out',
  ACTION_REJECTED: 'action.rejected',

  // Tool Feedback
  TOOL_ASSISTANT_QUERY_HELP: 'tool.assistant.query.help',
  TOOL_ASSISTANT_QUERY_TIME: 'tool.assistant.query.time',
  TOOL_ASSISTANT_QUERY_BATTERY: 'tool.assistant.query.battery',
  TOOL_ASSISTANT_QUERY_STATUS: 'tool.assistant.query.status',
  TOOL_ALIAS_LIST_EMPTY: 'tool.alias.list.empty',
  TOOL_ALIAS_LIST_RESULT: 'tool.alias.list.result',
  TOOL_ALIAS_REGISTER_SUCCESS: 'tool.alias.register.success',
  TOOL_CANCEL_SUCCESS: 'tool.cancel.success',

  // Errors
  ERR_VALIDATION_FAILED: 'error.validation.failed',
  ERR_UNRECOGNIZED_INTENT: 'error.unrecognized.intent',
  ERR_AMBIGUOUS_INTENT: 'error.ambiguous.intent',
  ERR_INVALID_TOKEN: 'error.invalid.token',
  ERR_TOKEN_EXPIRED: 'error.token.expired',
  ERR_TOKEN_REPLAY: 'error.token.replay',
  ERR_INTERNAL_ERROR: 'error.internal',
} as const;

export type MessageKey = (typeof MESSAGE_KEYS)[keyof typeof MESSAGE_KEYS];

export const DIALECT_LOCALES = {
  GAZA: 'ar-PS-Gaza',
  WEST_BANK: 'ar-PS-WestBank',
  JERUSALEM: 'ar-PS-Jerusalem',
  STANDARD: 'ar-STANDARD',
} as const;

export type DialectLocale = (typeof DIALECT_LOCALES)[keyof typeof DIALECT_LOCALES];

const ARABIC_MESSAGES: Record<MessageKey, string> = {
  [MESSAGE_KEYS.POLICY_CAPABILITY_DISABLED]: 'هذه الميزة غير مفعلة حالياً في النظام حفاظاً على أمانك.',
  [MESSAGE_KEYS.POLICY_USER_CONSENT_MISSING]: 'لم تقم بتفعيل إذن استخدام هذه الخاصية في الإعدادات.',
  [MESSAGE_KEYS.POLICY_OS_PERMISSION_DENIED]: 'التطبيق يحتاج إلى إذن من نظام الهاتف لمتابعة هذا الطلب.',
  [MESSAGE_KEYS.POLICY_CONFIRMATION_REQUIRED]: 'هذا الإجراء يتطلب تأكيدك الصوتي للمتابعة.',
  [MESSAGE_KEYS.POLICY_ALLOWED]: 'تمت الموافقة على الطلب بنجاح.',
  [MESSAGE_KEYS.POLICY_DENIED_UNKNOWN]: 'تم رفض الطلب وفقاً لسياسة الأمان.',

  [MESSAGE_KEYS.CONFIRM_CHALLENGE_DEFAULT]: 'هل تريد بالتأكيد المتابعة؟ أجب بنعم أو لا.',
  [MESSAGE_KEYS.CONFIRM_ALIAS_SET]: 'هل تريد ربط الاسم {aliasName} مع جهة الاتصال {targetContact}؟ أجب بنعم للمتابعة أو لا للإلغاء.',
  [MESSAGE_KEYS.CONFIRM_ALIAS_OVERWRITE]: 'اللقب {aliasName} موجود مسبقاً. هل تريد استبداله بـ {targetContact}؟',
  [MESSAGE_KEYS.CONFIRM_ALIAS_DELETE]: 'هل تريد حذف اللقب {aliasName}؟',
  [MESSAGE_KEYS.CONFIRM_CONTACT_CALL]: 'هل تريد الاتصال بـ {targetContact}؟ قل نعم للاتصال أو لا للإلغاء.',
  [MESSAGE_KEYS.CONFIRM_MESSAGE_SEND]: 'هل تريد إرسال الرسالة إلى {targetContact} بنص: "{body}"؟ قل نعم للإرسال أو لا للإلغاء.',
  [MESSAGE_KEYS.CONFIRM_LOCATION_SHARE]: 'هل تريد مشاركة موقعك الحالي مع {targetContact}؟ قل نعم للمشاركة أو لا للإلغاء.',
  [MESSAGE_KEYS.CONFIRM_CALENDAR_WRITE]: 'هل تريد إضافة موعد {eventTitle} في تاريخ {startTime}؟ قل نعم للحفظ أو لا للإلغاء.',
  [MESSAGE_KEYS.CONFIRM_EMERGENCY_TRIGGER]: 'تحذير: سيتم إطلاق نداء الطوارئ خلال 5 ثوانٍ. قل إلغاء للتراجع.',

  [MESSAGE_KEYS.ACTION_SUCCESS]: 'تمت العملية بنجاح.',
  [MESSAGE_KEYS.ACTION_CANCELLED]: 'تم إلغاء العملية بناءً على طلبك.',
  [MESSAGE_KEYS.ACTION_CONFIRMED]: 'تم التأكيد بنجاح وجاري المتابعة.',
  [MESSAGE_KEYS.ACTION_TIMED_OUT]: 'انتهى الوقت المحدد لتأكيد الطلب وتم إلغاؤه تلقائياً.',
  [MESSAGE_KEYS.ACTION_REJECTED]: 'تم رفض الإجراء.',

  [MESSAGE_KEYS.TOOL_ASSISTANT_QUERY_HELP]: 'أنا سند، مساعدك الصوتي لمساعدتك في استخدام هاتفك بأمان. يمكنك سؤالي عن الوقت والبطارية وإدارة أسماء الاتصال.',
  [MESSAGE_KEYS.TOOL_ASSISTANT_QUERY_TIME]: 'الوقت الحالي هو {currentTime}.',
  [MESSAGE_KEYS.TOOL_ASSISTANT_QUERY_BATTERY]: 'نسبة شحن البطارية {batteryLevel} بالمئة.',
  [MESSAGE_KEYS.TOOL_ASSISTANT_QUERY_STATUS]: 'نظام سند يعمل بصورة طبيعية وجميع الخدمات الأساسية متصلة.',
  [MESSAGE_KEYS.TOOL_ALIAS_LIST_EMPTY]: 'لا توجد ألقاب مسجلة لجهات الاتصال حتى الآن.',
  [MESSAGE_KEYS.TOOL_ALIAS_LIST_RESULT]: 'لديك {count} ألقاب مسجلة.',
  [MESSAGE_KEYS.TOOL_ALIAS_REGISTER_SUCCESS]: 'تم حفظ اللقب {aliasName} بنجاح.',
  [MESSAGE_KEYS.TOOL_CANCEL_SUCCESS]: 'تم إيقاف الإجراء فورا.',

  [MESSAGE_KEYS.ERR_VALIDATION_FAILED]: 'تعذر إكمال الطلب بسبب نقص أو عدم تطابق في البيانات المدخلة.',
  [MESSAGE_KEYS.ERR_UNRECOGNIZED_INTENT]: 'عذراً، لم أتمكن من فهم طلبك بوضوح. يرجى المحاولة مرة أخرى.',
  [MESSAGE_KEYS.ERR_AMBIGUOUS_INTENT]: 'طلبك غير واضح تماماً، هل تقصد أحد الإجراءات التالية؟',
  [MESSAGE_KEYS.ERR_INVALID_TOKEN]: 'رمز التفويض غير صالح أو تم التلاعب به.',
  [MESSAGE_KEYS.ERR_TOKEN_EXPIRED]: 'انتهت صلاحية رمز التفويض، يرجى إعادة المحاولة.',
  [MESSAGE_KEYS.ERR_TOKEN_REPLAY]: 'تم استخدام هذا الرمز سابقاً ولا يمكن إعادة استخدامه.',
  [MESSAGE_KEYS.ERR_INTERNAL_ERROR]: 'حدث خطأ غير متوقع في النظام. يرجى المحاولة لاحقاً.',
};

const ENGLISH_MESSAGES: Record<MessageKey, string> = {
  [MESSAGE_KEYS.POLICY_CAPABILITY_DISABLED]: 'This capability is currently disabled in the system for your security.',
  [MESSAGE_KEYS.POLICY_USER_CONSENT_MISSING]: 'User consent has not been granted for this feature in settings.',
  [MESSAGE_KEYS.POLICY_OS_PERMISSION_DENIED]: 'Application requires mobile operating system permission to proceed.',
  [MESSAGE_KEYS.POLICY_CONFIRMATION_REQUIRED]: 'This action requires your voice confirmation to proceed.',
  [MESSAGE_KEYS.POLICY_ALLOWED]: 'Request authorized successfully.',
  [MESSAGE_KEYS.POLICY_DENIED_UNKNOWN]: 'Request denied according to security policy.',

  [MESSAGE_KEYS.CONFIRM_CHALLENGE_DEFAULT]: 'Are you sure you want to proceed? Say yes or no.',
  [MESSAGE_KEYS.CONFIRM_ALIAS_SET]: 'Do you want to map alias {aliasName} to contact {targetContact}? Say yes or no.',
  [MESSAGE_KEYS.CONFIRM_ALIAS_OVERWRITE]: 'Alias {aliasName} already exists. Overwrite with {targetContact}?',
  [MESSAGE_KEYS.CONFIRM_ALIAS_DELETE]: 'Do you want to delete alias {aliasName}?',
  [MESSAGE_KEYS.CONFIRM_CONTACT_CALL]: 'Do you want to call {targetContact}? Say yes to call or no to cancel.',
  [MESSAGE_KEYS.CONFIRM_MESSAGE_SEND]: 'Send message to {targetContact} with text: "{body}"? Say yes to send or no to cancel.',
  [MESSAGE_KEYS.CONFIRM_LOCATION_SHARE]: 'Share your current location with {targetContact}? Say yes to share or no to cancel.',
  [MESSAGE_KEYS.CONFIRM_CALENDAR_WRITE]: 'Add calendar event {eventTitle} at {startTime}? Say yes to save or no to cancel.',
  [MESSAGE_KEYS.CONFIRM_EMERGENCY_TRIGGER]: 'Warning: Emergency protocol will trigger in 5 seconds. Say cancel to abort.',

  [MESSAGE_KEYS.ACTION_SUCCESS]: 'Operation completed successfully.',
  [MESSAGE_KEYS.ACTION_CANCELLED]: 'Operation cancelled at your request.',
  [MESSAGE_KEYS.ACTION_CONFIRMED]: 'Confirmed successfully. Proceeding.',
  [MESSAGE_KEYS.ACTION_TIMED_OUT]: 'Confirmation timed out and was automatically cancelled.',
  [MESSAGE_KEYS.ACTION_REJECTED]: 'Action rejected.',

  [MESSAGE_KEYS.TOOL_ASSISTANT_QUERY_HELP]: 'I am Sanad, your accessible voice assistant. You can ask for time, battery status, or manage contact aliases.',
  [MESSAGE_KEYS.TOOL_ASSISTANT_QUERY_TIME]: 'The current time is {currentTime}.',
  [MESSAGE_KEYS.TOOL_ASSISTANT_QUERY_BATTERY]: 'Battery level is {batteryLevel} percent.',
  [MESSAGE_KEYS.TOOL_ASSISTANT_QUERY_STATUS]: 'Sanad system is operating normally.',
  [MESSAGE_KEYS.TOOL_ALIAS_LIST_EMPTY]: 'No contact aliases configured yet.',
  [MESSAGE_KEYS.TOOL_ALIAS_LIST_RESULT]: 'You have {count} configured contact aliases.',
  [MESSAGE_KEYS.TOOL_ALIAS_REGISTER_SUCCESS]: 'Alias {aliasName} saved successfully.',
  [MESSAGE_KEYS.TOOL_CANCEL_SUCCESS]: 'Action immediately halted.',

  [MESSAGE_KEYS.ERR_VALIDATION_FAILED]: 'Request payload failed schema validation.',
  [MESSAGE_KEYS.ERR_UNRECOGNIZED_INTENT]: 'Sorry, I could not understand your request. Please try again.',
  [MESSAGE_KEYS.ERR_AMBIGUOUS_INTENT]: 'Your request was ambiguous. Did you mean one of the following?',
  [MESSAGE_KEYS.ERR_INVALID_TOKEN]: 'Authorization token is invalid or tampered with.',
  [MESSAGE_KEYS.ERR_TOKEN_EXPIRED]: 'Authorization token has expired. Please retry.',
  [MESSAGE_KEYS.ERR_TOKEN_REPLAY]: 'Authorization token was already consumed.',
  [MESSAGE_KEYS.ERR_INTERNAL_ERROR]: 'Unexpected system error. Please try again later.',
};

export interface MessageCatalogResolver {
  getMessage(key: MessageKey, locale?: string): string | undefined;
}

class InMemoryMessageCatalogResolver implements MessageCatalogResolver {
  private dynamicCatalogs = new Map<string, Partial<Record<MessageKey, string>>>();

  registerCatalog(locale: string, catalog: Partial<Record<MessageKey, string>>): void {
    this.dynamicCatalogs.set(locale, catalog);
  }

  getMessage(key: MessageKey, locale: string = 'ar-PS'): string | undefined {
    // 1. Check dynamically registered database/custom catalog
    const dynamic = this.dynamicCatalogs.get(locale);
    if (dynamic && dynamic[key]) {
      return dynamic[key];
    }

    // 2. Default Arabic catalog for ar-PS or variants
    if (locale.startsWith('ar')) {
      return ARABIC_MESSAGES[key];
    }

    // 3. Fallback to English
    return ENGLISH_MESSAGES[key] ?? ARABIC_MESSAGES[key];
  }
}

export const defaultCatalogResolver = new InMemoryMessageCatalogResolver();

/**
 * Resolves a localized message string by message key with template substitution.
 * Guarantees zero hardcoded message strings in core business logic.
 */
export function t(
  key: MessageKey,
  locale: string = 'ar-PS',
  params?: Record<string, string | number>,
  resolver: MessageCatalogResolver = defaultCatalogResolver
): string {
  let template = resolver.getMessage(key, locale) ?? ARABIC_MESSAGES[key] ?? key;

  if (params) {
    for (const [paramKey, paramVal] of Object.entries(params)) {
      template = template.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
    }
  }

  return template;
}
