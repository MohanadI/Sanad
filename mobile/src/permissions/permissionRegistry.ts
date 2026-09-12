import { CapabilityId, PermissionDefinition, PermissionId, RiskTier } from './types';

export const PERMISSION_DEFINITIONS: Record<PermissionId, PermissionDefinition> = {
  'sanad:perm:system:query': {
    id: 'sanad:perm:system:query',
    nameArabic: 'استعلامات النظام والمساعدة',
    nameEnglish: 'System Query & Help',
    descriptionArabic: 'قراءة المساعدة العامة والوقت وحالة النظام.',
    descriptionEnglish: 'Read general help, status, time, and system assistance.',
    riskTier: 'LOW',
    isGated: false,
    requiresUserConsent: true,
    requiresConfirmation: false,
  },
  'sanad:perm:alias:read': {
    id: 'sanad:perm:alias:read',
    nameArabic: 'قراءة ألقاب جهات الاتصال',
    nameEnglish: 'Read Contact Aliases',
    descriptionArabic: 'قراءة الألقاب المسجلة مثل مرتي أو أخوي.',
    descriptionEnglish: 'Read custom kinship and nickname mappings.',
    riskTier: 'LOW',
    isGated: false,
    requiresUserConsent: true,
    requiresConfirmation: false,
  },
  'sanad:perm:alias:write': {
    id: 'sanad:perm:alias:write',
    nameArabic: 'إدارة ألقاب جهات الاتصال',
    nameEnglish: 'Manage Contact Aliases',
    descriptionArabic: 'إضافة أو تعديل أو حذف الألقاب والكنى.',
    descriptionEnglish: 'Add, modify, or delete contact nicknames and aliases.',
    riskTier: 'LOW',
    isGated: false,
    requiresUserConsent: true,
    requiresConfirmation: true, // on overwrite/delete
  },
  'sanad:perm:audit:read': {
    id: 'sanad:perm:audit:read',
    nameArabic: 'قراءة سجل الأمان والخصوصية',
    nameEnglish: 'Inspect Audit Logs',
    descriptionArabic: 'الاطلاع على سجلات الوصول والعمليات المنفذة.',
    descriptionEnglish: 'Inspect audit history and access records.',
    riskTier: 'LOW',
    isGated: false,
    requiresUserConsent: true,
    requiresConfirmation: false,
  },
  'sanad:perm:contacts:read': {
    id: 'sanad:perm:contacts:read',
    nameArabic: 'الوصول إلى دفتر العناوين',
    nameEnglish: 'Read Contacts',
    descriptionArabic: 'مطابقة الأسماء لحل الألقاب وجهات الاتصال.',
    descriptionEnglish: 'Access local address book to resolve names and numbers.',
    riskTier: 'HIGH',
    androidPermission: 'android.permission.READ_CONTACTS',
    isGated: false,
    requiresUserConsent: true,
    requiresConfirmation: false,
  },
  'sanad:perm:telephony:call': {
    id: 'sanad:perm:telephony:call',
    nameArabic: 'إجراء المكالمات الهاتفية',
    nameEnglish: 'Initiate Phone Calls',
    descriptionArabic: 'إجراء مكالمات صوتية عبر شريحة الهاتف.',
    descriptionEnglish: 'Initiate native cellular phone calls.',
    riskTier: 'HIGH',
    androidPermission: 'android.permission.CALL_PHONE',
    isGated: true, // DEFERRED_GATED
    requiresUserConsent: true,
    requiresConfirmation: true,
  },
  'sanad:perm:sms:send': {
    id: 'sanad:perm:sms:send',
    nameArabic: 'إرسال الرسائل النصية',
    nameEnglish: 'Send SMS Messages',
    descriptionArabic: 'إنشاء وإرسال رسائل نصية قصيرة.',
    descriptionEnglish: 'Compose and dispatch SMS messages.',
    riskTier: 'HIGH',
    androidPermission: 'android.permission.SEND_SMS',
    isGated: true, // DEFERRED_GATED
    requiresUserConsent: true,
    requiresConfirmation: true,
  },
  'sanad:perm:location:read': {
    id: 'sanad:perm:location:read',
    nameArabic: 'قراءة الموقع الجغرافي',
    nameEnglish: 'Read Location',
    descriptionArabic: 'الوصول إلى إحداثيات الموقع الحالي.',
    descriptionEnglish: 'Access current device GPS coordinates.',
    riskTier: 'MEDIUM',
    androidPermission: 'android.permission.ACCESS_FINE_LOCATION',
    isGated: true, // DEFERRED_GATED
    requiresUserConsent: true,
    requiresConfirmation: false,
  },
  'sanad:perm:location:share': {
    id: 'sanad:perm:location:share',
    nameArabic: 'مشاركة الموقع الجغرافي',
    nameEnglish: 'Share Location',
    descriptionArabic: 'إرسال تفاصيل الموقع لجهة اتصال معينة.',
    descriptionEnglish: 'Transmit location link to a third party.',
    riskTier: 'HIGH',
    androidPermission: 'android.permission.ACCESS_FINE_LOCATION',
    isGated: true, // DEFERRED_GATED
    requiresUserConsent: true,
    requiresConfirmation: true,
  },
  'sanad:perm:calendar:read': {
    id: 'sanad:perm:calendar:read',
    nameArabic: 'قراءة المواعيد والتقويم',
    nameEnglish: 'Read Calendar',
    descriptionArabic: 'الاستعلام عن المواعيد والالتزامات القادمة.',
    descriptionEnglish: 'Query upcoming appointments.',
    riskTier: 'LOW',
    androidPermission: 'android.permission.READ_CALENDAR',
    isGated: true, // DEFERRED_GATED
    requiresUserConsent: true,
    requiresConfirmation: false,
  },
  'sanad:perm:calendar:write': {
    id: 'sanad:perm:calendar:write',
    nameArabic: 'تعديل وحجز المواعيد',
    nameEnglish: 'Write Calendar',
    descriptionArabic: 'إضافة أو تعديل موعد في التقويم.',
    descriptionEnglish: 'Insert, update, or cancel calendar entries.',
    riskTier: 'MEDIUM',
    androidPermission: 'android.permission.WRITE_CALENDAR',
    isGated: true, // DEFERRED_GATED
    requiresUserConsent: true,
    requiresConfirmation: true,
  },
  'sanad:perm:emergency:alert': {
    id: 'sanad:perm:emergency:alert',
    nameArabic: 'تنبيه الطوارئ والاستغاثة',
    nameEnglish: 'Emergency Alert',
    descriptionArabic: 'إطلاق مسار الطوارئ للأشخاص الموثوقين أو الإسعاف.',
    descriptionEnglish: 'Trigger emergency contact escalation workflow.',
    riskTier: 'CRITICAL',
    androidPermission: 'android.permission.CALL_PHONE',
    isGated: true, // DEFERRED_GATED
    requiresUserConsent: true,
    requiresConfirmation: true,
  },
};

/**
 * Capability-to-Permissions mapping matching Section 3 of PERMISSION_MATRIX.md.
 */
export const CAPABILITY_PERMISSIONS_MAP: Record<CapabilityId, {
  requiredPermissions: PermissionId[];
  osPermission?: string;
  riskTier: RiskTier;
  requiresConfirmation: boolean;
}> = {
  CAP_ASSISTANT_QUERY: {
    requiredPermissions: ['sanad:perm:system:query'],
    riskTier: 'LOW',
    requiresConfirmation: false,
  },
  CAP_ALIAS_MANAGE: {
    requiredPermissions: ['sanad:perm:alias:read', 'sanad:perm:alias:write'],
    riskTier: 'LOW',
    requiresConfirmation: false,
  },
  CAP_SETTINGS_ACCESSIBILITY: {
    requiredPermissions: [],
    riskTier: 'LOW',
    requiresConfirmation: false,
  },
  CAP_AUDIT_INSPECT: {
    requiredPermissions: ['sanad:perm:audit:read'],
    riskTier: 'LOW',
    requiresConfirmation: false,
  },
  CAP_ACTION_CANCEL: {
    requiredPermissions: [],
    riskTier: 'LOW',
    requiresConfirmation: false,
  },
  CAP_CONTACT_CALL: {
    requiredPermissions: ['sanad:perm:contacts:read', 'sanad:perm:telephony:call'],
    osPermission: 'android.permission.CALL_PHONE',
    riskTier: 'HIGH',
    requiresConfirmation: true,
  },
  CAP_MESSAGE_SEND: {
    requiredPermissions: ['sanad:perm:contacts:read', 'sanad:perm:sms:send'],
    osPermission: 'android.permission.SEND_SMS',
    riskTier: 'HIGH',
    requiresConfirmation: true,
  },
  CAP_LOCATION_READ: {
    requiredPermissions: ['sanad:perm:location:read'],
    osPermission: 'android.permission.ACCESS_FINE_LOCATION',
    riskTier: 'MEDIUM',
    requiresConfirmation: false,
  },
  CAP_LOCATION_SHARE: {
    requiredPermissions: ['sanad:perm:location:read', 'sanad:perm:location:share'],
    osPermission: 'android.permission.ACCESS_FINE_LOCATION',
    riskTier: 'HIGH',
    requiresConfirmation: true,
  },
  CAP_CALENDAR_READ: {
    requiredPermissions: ['sanad:perm:calendar:read'],
    osPermission: 'android.permission.READ_CALENDAR',
    riskTier: 'LOW',
    requiresConfirmation: false,
  },
  CAP_CALENDAR_WRITE: {
    requiredPermissions: ['sanad:perm:calendar:read', 'sanad:perm:calendar:write'],
    osPermission: 'android.permission.WRITE_CALENDAR',
    riskTier: 'MEDIUM',
    requiresConfirmation: true,
  },
  CAP_EMERGENCY_TRIGGER: {
    requiredPermissions: ['sanad:perm:emergency:alert', 'sanad:perm:telephony:call'],
    osPermission: 'android.permission.CALL_PHONE',
    riskTier: 'CRITICAL',
    requiresConfirmation: true,
  },
};
