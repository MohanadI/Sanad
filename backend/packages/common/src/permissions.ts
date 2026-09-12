import { z } from 'zod';
import type { CapabilityId } from './capabilities.js';

export const PERMISSIONS = {
  SYSTEM_QUERY: 'sanad:perm:system:query',
  ALIAS_READ: 'sanad:perm:alias:read',
  ALIAS_WRITE: 'sanad:perm:alias:write',
  AUDIT_READ: 'sanad:perm:audit:read',
  CONTACTS_READ: 'sanad:perm:contacts:read',
  TELEPHONY_CALL: 'sanad:perm:telephony:call',
  SMS_SEND: 'sanad:perm:sms:send',
  LOCATION_READ: 'sanad:perm:location:read',
  LOCATION_SHARE: 'sanad:perm:location:share',
  CALENDAR_READ: 'sanad:perm:calendar:read',
  CALENDAR_WRITE: 'sanad:perm:calendar:write',
  EMERGENCY_ALERT: 'sanad:perm:emergency:alert',
} as const;

export type PermissionId = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PermissionIdSchema = z.enum([
  'sanad:perm:system:query',
  'sanad:perm:alias:read',
  'sanad:perm:alias:write',
  'sanad:perm:audit:read',
  'sanad:perm:contacts:read',
  'sanad:perm:telephony:call',
  'sanad:perm:sms:send',
  'sanad:perm:location:read',
  'sanad:perm:location:share',
  'sanad:perm:calendar:read',
  'sanad:perm:calendar:write',
  'sanad:perm:emergency:alert',
]);

export const CAPABILITY_PERMISSIONS: Record<CapabilityId, readonly PermissionId[]> = {
  CAP_ASSISTANT_QUERY: [PERMISSIONS.SYSTEM_QUERY],
  CAP_ALIAS_MANAGE: [PERMISSIONS.ALIAS_READ, PERMISSIONS.ALIAS_WRITE],
  CAP_SETTINGS_ACCESSIBILITY: [],
  CAP_AUDIT_INSPECT: [PERMISSIONS.AUDIT_READ],
  CAP_ACTION_CANCEL: [],

  // Deferred capabilities
  CAP_CONTACT_CALL: [PERMISSIONS.CONTACTS_READ, PERMISSIONS.TELEPHONY_CALL],
  CAP_MESSAGE_SEND: [PERMISSIONS.CONTACTS_READ, PERMISSIONS.SMS_SEND],
  CAP_LOCATION_READ: [PERMISSIONS.LOCATION_READ],
  CAP_LOCATION_SHARE: [PERMISSIONS.LOCATION_READ, PERMISSIONS.LOCATION_SHARE],
  CAP_CALENDAR_READ: [PERMISSIONS.CALENDAR_READ],
  CAP_CALENDAR_WRITE: [PERMISSIONS.CALENDAR_READ, PERMISSIONS.CALENDAR_WRITE],
  CAP_EMERGENCY_TRIGGER: [PERMISSIONS.EMERGENCY_ALERT, PERMISSIONS.TELEPHONY_CALL],
};

export const CAPABILITY_OS_PERMS: Record<CapabilityId, string | undefined> = {
  CAP_ASSISTANT_QUERY: undefined,
  CAP_ALIAS_MANAGE: undefined,
  CAP_SETTINGS_ACCESSIBILITY: undefined,
  CAP_AUDIT_INSPECT: undefined,
  CAP_ACTION_CANCEL: undefined,

  // Deferred OS permissions
  CAP_CONTACT_CALL: 'android.permission.CALL_PHONE',
  CAP_MESSAGE_SEND: 'android.permission.SEND_SMS',
  CAP_LOCATION_READ: 'android.permission.ACCESS_FINE_LOCATION',
  CAP_LOCATION_SHARE: 'android.permission.ACCESS_FINE_LOCATION',
  CAP_CALENDAR_READ: 'android.permission.READ_CALENDAR',
  CAP_CALENDAR_WRITE: 'android.permission.WRITE_CALENDAR',
  CAP_EMERGENCY_TRIGGER: 'android.permission.CALL_PHONE',
};
