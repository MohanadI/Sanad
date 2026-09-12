import { z } from 'zod';
import { CapabilityIdSchema, type CapabilityId } from './capabilities.js';

export const INTENTS = {
  // Core active intents
  INTENT_ASSISTANT_QUERY: 'INTENT_ASSISTANT_QUERY',
  INTENT_ALIAS_SET: 'INTENT_ALIAS_SET',
  INTENT_ALIAS_LIST: 'INTENT_ALIAS_LIST',
  INTENT_ALIAS_DELETE: 'INTENT_ALIAS_DELETE',
  INTENT_ACTION_CONFIRM: 'INTENT_ACTION_CONFIRM',
  INTENT_ACTION_CANCEL: 'INTENT_ACTION_CANCEL',

  // Gated / deferred intents
  INTENT_CONTACT_CALL: 'INTENT_CONTACT_CALL',
  INTENT_MESSAGE_SEND: 'INTENT_MESSAGE_SEND',
  INTENT_LOCATION_QUERY: 'INTENT_LOCATION_QUERY',
  INTENT_LOCATION_SHARE: 'INTENT_LOCATION_SHARE',
  INTENT_CALENDAR_QUERY: 'INTENT_CALENDAR_QUERY',
  INTENT_CALENDAR_CREATE: 'INTENT_CALENDAR_CREATE',
  INTENT_EMERGENCY_TRIGGER: 'INTENT_EMERGENCY_TRIGGER',

  // Fallback / disambiguation intents
  INTENT_UNRECOGNIZED: 'INTENT_UNRECOGNIZED',
  INTENT_AMBIGUOUS: 'INTENT_AMBIGUOUS',
} as const;

export type IntentId = (typeof INTENTS)[keyof typeof INTENTS];

export const IntentIdSchema = z.enum([
  'INTENT_ASSISTANT_QUERY',
  'INTENT_ALIAS_SET',
  'INTENT_ALIAS_LIST',
  'INTENT_ALIAS_DELETE',
  'INTENT_ACTION_CONFIRM',
  'INTENT_ACTION_CANCEL',
  'INTENT_CONTACT_CALL',
  'INTENT_MESSAGE_SEND',
  'INTENT_LOCATION_QUERY',
  'INTENT_LOCATION_SHARE',
  'INTENT_CALENDAR_QUERY',
  'INTENT_CALENDAR_CREATE',
  'INTENT_EMERGENCY_TRIGGER',
  'INTENT_UNRECOGNIZED',
  'INTENT_AMBIGUOUS',
]);

/**
 * Slot schemas per intent - strictly validated to prevent prompt injection or unexpected fields
 */
export const AssistantQuerySlotsSchema = z
  .object({
    queryType: z.enum([
      'HELP',
      'SYSTEM_STATUS',
      'TIME_DATE',
      'BATTERY_STATUS',
      'CALL_LOG_STATUS',
      'GENERAL_GUIDANCE',
    ]),
    topic: z.string().max(100).optional(),
  })
  .strict();

export const AliasSetSlotsSchema = z
  .object({
    aliasName: z.string().min(1).max(50),
    targetContact: z.string().min(1).max(100),
    targetContactId: z.string().uuid().optional(),
  })
  .strict();

export const AliasListSlotsSchema = z.object({}).strict();

export const AliasDeleteSlotsSchema = z
  .object({
    aliasName: z.string().min(1).max(50),
  })
  .strict();

export const ActionConfirmSlotsSchema = z
  .object({
    response: z.literal('AFFIRMATIVE'),
  })
  .strict();

export const ActionCancelSlotsSchema = z.object({}).strict();

export const ContactCallSlotsSchema = z
  .object({
    targetContact: z.string().min(1).max(100),
    phoneType: z.enum(['MOBILE', 'HOME', 'WORK']).optional(),
  })
  .strict();

export const MessageSendSlotsSchema = z
  .object({
    targetContact: z.string().min(1).max(100),
    body: z.string().min(1).max(500),
  })
  .strict();

export const LocationQuerySlotsSchema = z
  .object({
    detailLevel: z.enum(['COARSE', 'DETAILED']).optional(),
  })
  .strict();

export const LocationShareSlotsSchema = z
  .object({
    targetContact: z.string().min(1).max(100),
    durationMinutes: z.number().int().min(1).max(1440).optional(),
  })
  .strict();

export const CalendarQuerySlotsSchema = z
  .object({
    timeRange: z.enum(['TODAY', 'TOMORROW', 'THIS_WEEK']).optional(),
  })
  .strict();

export const CalendarCreateSlotsSchema = z
  .object({
    eventTitle: z.string().min(1).max(150),
    startTime: z.string().datetime(),
    durationMinutes: z.number().int().positive().optional(),
  })
  .strict();

export const EmergencyTriggerSlotsSchema = z.object({}).strict();

export const UnrecognizedSlotsSchema = z
  .object({
    rawUtterance: z.string().max(500),
  })
  .strict();

export const AmbiguousSlotsSchema = z
  .object({
    candidateIntents: z.array(IntentIdSchema).min(1).max(5),
    rawUtterance: z.string().max(500),
  })
  .strict();

export const IntentSlotsMap = {
  INTENT_ASSISTANT_QUERY: AssistantQuerySlotsSchema,
  INTENT_ALIAS_SET: AliasSetSlotsSchema,
  INTENT_ALIAS_LIST: AliasListSlotsSchema,
  INTENT_ALIAS_DELETE: AliasDeleteSlotsSchema,
  INTENT_ACTION_CONFIRM: ActionConfirmSlotsSchema,
  INTENT_ACTION_CANCEL: ActionCancelSlotsSchema,
  INTENT_CONTACT_CALL: ContactCallSlotsSchema,
  INTENT_MESSAGE_SEND: MessageSendSlotsSchema,
  INTENT_LOCATION_QUERY: LocationQuerySlotsSchema,
  INTENT_LOCATION_SHARE: LocationShareSlotsSchema,
  INTENT_CALENDAR_QUERY: CalendarQuerySlotsSchema,
  INTENT_CALENDAR_CREATE: CalendarCreateSlotsSchema,
  INTENT_EMERGENCY_TRIGGER: EmergencyTriggerSlotsSchema,
  INTENT_UNRECOGNIZED: UnrecognizedSlotsSchema,
  INTENT_AMBIGUOUS: AmbiguousSlotsSchema,
} as const;

/**
 * Mapping of Intent to canonical Target Capability
 */
export const INTENT_CAPABILITY_MAP: Record<IntentId, CapabilityId> = {
  INTENT_ASSISTANT_QUERY: 'CAP_ASSISTANT_QUERY',
  INTENT_ALIAS_SET: 'CAP_ALIAS_MANAGE',
  INTENT_ALIAS_LIST: 'CAP_ALIAS_MANAGE',
  INTENT_ALIAS_DELETE: 'CAP_ALIAS_MANAGE',
  INTENT_ACTION_CONFIRM: 'CAP_ACTION_CANCEL',
  INTENT_ACTION_CANCEL: 'CAP_ACTION_CANCEL',
  INTENT_CONTACT_CALL: 'CAP_CONTACT_CALL',
  INTENT_MESSAGE_SEND: 'CAP_MESSAGE_SEND',
  INTENT_LOCATION_QUERY: 'CAP_LOCATION_READ',
  INTENT_LOCATION_SHARE: 'CAP_LOCATION_SHARE',
  INTENT_CALENDAR_QUERY: 'CAP_CALENDAR_READ',
  INTENT_CALENDAR_CREATE: 'CAP_CALENDAR_WRITE',
  INTENT_EMERGENCY_TRIGGER: 'CAP_EMERGENCY_TRIGGER',
  INTENT_UNRECOGNIZED: 'CAP_ASSISTANT_QUERY',
  INTENT_AMBIGUOUS: 'CAP_ASSISTANT_QUERY',
} as const;

/**
 * StructuredActionCandidate emitted by the Intent Classifier
 */
export const StructuredActionCandidateSchema = z
  .object({
    intentId: IntentIdSchema,
    targetCapability: CapabilityIdSchema,
    confidence: z.number().min(0).max(1),
    slots: z.record(z.unknown()),
    requiresConfirmation: z.boolean(),
    rawUtteranceSanitized: z.string().max(500),
  })
  .strict();

export type StructuredActionCandidate = z.infer<typeof StructuredActionCandidateSchema>;

/**
 * Validated StructuredAction processed by the Policy Engine
 */
export const StructuredActionSchema = z
  .object({
    actionId: z.string().uuid(),
    intentId: IntentIdSchema,
    targetCapability: CapabilityIdSchema,
    confidence: z.number().min(0).max(1),
    slots: z.record(z.unknown()),
    requiresConfirmation: z.boolean(),
    rawUtteranceSanitized: z.string().max(500),
    createdAt: z.string().datetime(),
  })
  .strict();

export type StructuredAction = z.infer<typeof StructuredActionSchema>;

/**
 * Validates candidate slots against the specific schema for its intentId
 */
export function validateIntentSlots(
  intentId: IntentId,
  slots: Record<string, unknown>
): Record<string, unknown> {
  const schema = IntentSlotsMap[intentId];
  if (!schema) {
    throw new Error(`No slot schema registered for intent: ${intentId}`);
  }
  return schema.parse(slots);
}
