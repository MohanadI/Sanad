import { StructuredAction, DeviceContext } from './contracts.js';

export interface MockContact {
  id: string;
  name: string;
  phone: string;
  normalizedName: string;
}

export const MOCK_CONTACTS: MockContact[] = [
  { id: 'cnt_001', name: 'هدى محمد', phone: '+972599111222', normalizedName: 'هدي محمد' },
  { id: 'cnt_002', name: 'أحمد النجار', phone: '+972599333444', normalizedName: 'احمد النجار' },
  { id: 'cnt_003', name: 'أحمد خليل', phone: '+972599555666', normalizedName: 'احمد خليل' },
  { id: 'cnt_004', name: 'د. سامر عيون', phone: '+972599777888', normalizedName: 'د سامر عيون' },
  { id: 'cnt_005', name: 'فاطمة إبراهيم', phone: '+972599999000', normalizedName: 'فاطمه ابراهيم' },
];

export const MOCK_DEVICE_CONTEXT_VALID: DeviceContext = {
  deviceId: 'dev_android_pixel7a_sanad_001',
  appVersion: '1.0.0-pilot',
  osPermissionsGranted: [
    'android.permission.RECORD_AUDIO',
    'android.permission.READ_CONTACTS',
  ],
  networkState: 'ONLINE_CELLULAR',
  batteryLevelPercent: 78,
  isLowBattery: false,
};

export const MOCK_DEVICE_CONTEXT_OFFLINE: DeviceContext = {
  ...MOCK_DEVICE_CONTEXT_VALID,
  networkState: 'OFFLINE',
};

export const MOCK_DEVICE_CONTEXT_LOW_BATTERY: DeviceContext = {
  ...MOCK_DEVICE_CONTEXT_VALID,
  batteryLevelPercent: 8,
  isLowBattery: true,
};

export const MOCK_USER_ID = 'usr_palestine_blind_pilot_01';

export const MOCK_SAMPLE_ACTIONS = {
  assistantQueryTime: {
    intentId: 'INTENT_ASSISTANT_QUERY' as const,
    targetCapability: 'CAP_ASSISTANT_QUERY' as const,
    confidence: 0.96,
    slots: { queryType: 'TIME_AND_STATUS' },
    requiresConfirmation: false,
    rawUtteranceSanitized: 'قديش الساعه وشو حاله التطبيق',
  } satisfies StructuredAction,

  aliasSetNew: {
    intentId: 'INTENT_ALIAS_SET' as const,
    targetCapability: 'CAP_ALIAS_MANAGE' as const,
    confidence: 0.92,
    slots: { aliasName: 'مرتي', targetContactName: 'هدى محمد' },
    requiresConfirmation: false,
    rawUtteranceSanitized: 'احفظ مرتي ك هدي محمد',
  } satisfies StructuredAction,

  aliasSetOverwrite: {
    intentId: 'INTENT_ALIAS_SET' as const,
    targetCapability: 'CAP_ALIAS_MANAGE' as const,
    confidence: 0.94,
    slots: { aliasName: 'مرتي', targetContactName: 'فاطمة إبراهيم' },
    requiresConfirmation: true, // Overwriting existing alias triggers high risk confirmation
    rawUtteranceSanitized: 'غير مرتي وخليها فاطمه ابراهيم',
  } satisfies StructuredAction,

  aliasClearAll: {
    intentId: 'INTENT_ALIAS_CLEAR_ALL' as const,
    targetCapability: 'CAP_ALIAS_MANAGE' as const,
    confidence: 0.95,
    slots: {},
    requiresConfirmation: true,
    rawUtteranceSanitized: 'احذف كل الالقاب المحفوظه',
  } satisfies StructuredAction,

  actionCancel: {
    intentId: 'INTENT_ACTION_CANCEL' as const,
    targetCapability: 'CAP_ACTION_CANCEL' as const,
    confidence: 0.99,
    slots: {},
    requiresConfirmation: false,
    rawUtteranceSanitized: 'وقف',
  } satisfies StructuredAction,

  // GATED Actions - strictly disabled in Policy Engine
  gatedCall: {
    intentId: 'INTENT_CONTACT_CALL' as const,
    targetCapability: 'CAP_CONTACT_CALL' as const,
    confidence: 0.94,
    slots: { targetContact: 'اخوي' },
    requiresConfirmation: true,
    rawUtteranceSanitized: 'رن علي اخوي',
  } satisfies StructuredAction,

  gatedMessage: {
    intentId: 'INTENT_MESSAGE_SEND' as const,
    targetCapability: 'CAP_MESSAGE_SEND' as const,
    confidence: 0.93,
    slots: { targetContact: 'احمد', body: 'انا بالطريق' },
    requiresConfirmation: true,
    rawUtteranceSanitized: 'ابعت رساله لاحمد انا بالطريق',
  } satisfies StructuredAction,

  gatedEmergency: {
    intentId: 'INTENT_EMERGENCY_TRIGGER' as const,
    targetCapability: 'CAP_EMERGENCY_TRIGGER' as const,
    confidence: 0.98,
    slots: {},
    requiresConfirmation: true,
    rawUtteranceSanitized: 'طوارئ النجده',
  } satisfies StructuredAction,
};
