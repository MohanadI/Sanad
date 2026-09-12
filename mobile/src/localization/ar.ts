import { Translations } from './types';

export const arTranslations: Translations = {
  app_name: 'سند',
  app_tagline: 'مساعدك الذكي الصوتي الميسر',

  // Status & Greetings
  greeting_morning: 'صباح الخير، سند جاهز لمساعدتك',
  greeting_evening: 'مساء الخير، سند جاهز لمساعدتك',
  status_ready: 'سند متصل وجاهز للاستماع',
  status_listening: 'جاري الاستماع إليك... تفضل بالتحدث',
  status_thinking: 'جاري معالجة طلبك...',
  status_speaking: 'سند يتحدث الآن',
  status_offline: 'غير متصل بالشبكة، يعمل بالنظام المحلي',

  // Actions
  action_listen: 'بدء الاستماع الصوتي',
  action_stop: 'إيقاف',
  action_cancel: 'إلغاء الأمر',
  action_confirm: 'تأكيد المتابعة',
  action_deny: 'رفض',
  action_retry: 'إعادة المحاولة',
  action_save: 'حفظ',
  action_delete: 'حذف',
  action_back: 'الرجوع',
  action_purge_emergency: 'مسح الطوارئ الفوري للبيانات',

  // Navigation
  nav_home: 'الرئيسية',
  nav_voice: 'المساعد الصوتي',
  nav_aliases: 'الألقاب',
  nav_permissions: 'الأذونات',
  nav_settings: 'الإعدادات',
  nav_audit: 'سجل الخصوصية',

  // Screen Titles
  title_home: 'شاشة سند الرئيسية',
  title_voice: 'التفاعل الصوتي المباشر',
  title_aliases: 'إدارة ألقاب جهات الاتصال',
  title_permissions: 'أذونات وصلاحيات التطبيق',
  title_settings: 'إعدادات النظام والوصول',
  title_audit: 'سجل الأنشطة والأمان',
  title_confirm: 'تأكيد الإجراء المطلوب',

  // Confirmations
  confirm_prompt_general: 'هل تريد بالتأكيد المتابعة في هذا الإجراء؟ قل نعم للمتابعة أو لا للإلغاء.',
  confirm_affirmative: 'نعم، تابع',
  confirm_negative: 'لا، تراجع',
  confirm_cancel: 'إلغاء',
  confirm_timeout_warning: 'تبقى 10 ثوانٍ قبل إلغاء العملية تلقائياً حفاظاً على أمانك.',
  confirm_purge_prompt: 'تحذير أمني شديد: سيتم مسح جميع الجلسات والألقاب والبيانات المحلية فوراً. هل تؤكد المسح؟',
  confirm_purge_success: 'تم تنفيذ مسح الطوارئ بنجاح وتصفير كافة البيانات المشفرة.',

  // Aliases
  alias_empty: 'لا توجد ألقاب مسجلة حالياً. يمكنك إضافة ألقاب مثل مرتي أو أخوي.',
  alias_add_new: 'إضافة لقب جديد لجهة اتصال',
  alias_name_label: 'اللقب (مثال: دكتور العيون)',
  alias_contact_label: 'اسم جهة الاتصال في الهاتف',
  alias_added_success: 'تم حفظ اللقب بنجاح.',
  alias_deleted_success: 'تم حذف اللقب بنجاح.',
  alias_exists_overwrite_prompt: 'هذا اللقب مسجل مسبقاً. هل تريد تحديثه؟',

  // Permissions & Tiers
  perm_tier1_feature_gate: 'المستوى الأول: بوابة الميزات الأساسية',
  perm_tier2_user_consent: 'المستوى الثاني: موافقة المستخدم الصريحة',
  perm_tier3_os_runtime: 'المستوى الثالث: إذن نظام أندرويد',
  perm_tier4_action_challenge: 'المستوى الرابع: التحقق وتأكيد العمليات الخطرة',
  perm_status_granted: 'ممنوح ومفعل',
  perm_status_denied: 'مرفوض أو غير مفعل',
  perm_status_blocked: 'محظور من النظام، يرجى التفعيل من الإعدادات',
  perm_btn_grant: 'تفعيل الإذن',
  perm_btn_revoke: 'تعطيل الإذن',

  // Capability Gates (Arabic Explanations)
  gate_call_disabled: 'خاصية إجراء المكالمات الهاتفية غير مفعلة حالياً في هذه النسخة حفاظاً على أمانك.',
  gate_sms_disabled: 'خاصية إرسال الرسائل النصية القصيرة غير مفعلة حالياً في هذه النسخة حفاظاً على أمانك.',
  gate_location_disabled: 'خاصية تحديد ومشاركة الموقع الجغرافي غير مفعلة حالياً في هذه النسخة حفاظاً على خصوصيتك وأمانك.',
  gate_calendar_disabled: 'خاصية الوصول إلى التقويم والمواعيد غير مفعلة حالياً في هذه النسخة حفاظاً على أمانك.',
  gate_emergency_disabled: 'خاصية طلب الطوارئ التلقائي قيد التطوير المعتمد مع الهلال الأحمر وغير مفعلة حالياً.',

  // Earcon Descriptions for Screen Readers
  earcon_desc_listening_start: 'نغمة بدء الاستماع الصوتي: الميكروفون نشط الآن',
  earcon_desc_thinking: 'نغمة المعالجة: جاري التفكير',
  earcon_desc_confirm: 'نغمة طلب التأكيد: مطلوب منك الرد بنعم أو لا',
  earcon_desc_success: 'نغمة النجاح: تم تنفيذ العملية بنجاح',
  earcon_desc_cancelled: 'نغمة الإلغاء: تم إلغاء العملية والعودة للوضع الطبيعي',
  earcon_desc_error: 'نغمة الخطأ: تعذر تنفيذ الطلب أو تم رفضه أمنياً',
  earcon_desc_emergency_countdown: 'نغمة عداد الطوارئ التنازلي: انتبه، جاري الاستعداد للاتصال بالطوارئ',

  // Emergency Workflow (ADR-005)
  emergency_countdown_start: 'بدء عداد الطوارئ التنازلي. سيتم الاتصال بعد خمس ثوانٍ. قل إلغاء للتراجع.',
  emergency_cancelled: 'تم إلغاء طلب الطوارئ والعودة للوضع الطبيعي.',
  emergency_dispatched: 'انتهى العداد، جاري تنفيذ الاتصال برقم الطوارئ المعتمد.',

  // Location Privacy Guard (SEC-P2-02)
  location_privacy_warning: 'موقعك حساس. هل تريد سماعه عبر السماعة الخارجية؟',
  location_privacy_earcon: 'نغمة حماية خصوصية الموقع الجغرافي',

  // Accessibility Hints
  a11y_hint_double_tap_listen: 'انقر مرتين للبدء في التحدث مع سند',
  a11y_hint_cancel_current: 'انقر مرتين لإلغاء الأمر الصوتي الحالي فوراً',
  a11y_hint_screen_curtain: 'انقر مرتين لتبديل ستارة الشاشة لحماية خصوصيتك من المتطفلين',
  a11y_hint_purge_emergency: 'انقر مرتين لتنفيذ مسح أمني شامل وفوري لكافة البيانات',
  a11y_live_screen_changed: 'تم الانتقال إلى شاشة',
  a11y_screen_curtain_active: 'ستارة الشاشة مفعلة الآن، الشاشة معتمة والتطبيق يعمل صوتياً',
  a11y_screen_curtain_inactive: 'ستارة الشاشة معطلة الآن، الشاشة مضاءة بشكل طبيعي',

  // Errors
  error_general: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.',
  error_network: 'تعذر الاتصال بالخادم، يرجى التحقق من الشبكة.',
  error_unrecognized_intent: 'عذراً، لم أفهم طلبك بدقة. يرجى إعادة صياغته.',
  error_unauthorized: 'العملية غير مصرح بها أمنياً من قبل محرك السياسات.',
  error_token_expired: 'انتهت صلاحية رمز التأكيد، يرجى إعادة الطلب من جديد.',
};
