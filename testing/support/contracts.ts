import { z } from 'zod';
import { CapabilityIdSchema, RiskTierSchema } from '@sanad/common';

// ==========================================
// 1. Assistant Ingress Contracts
// ==========================================

export const DialectLocaleSchema = z.enum([
  'ar-PS-Gaza',
  'ar-PS-WestBank',
  'ar-PS-Jerusalem',
  'ar-STANDARD',
]);
export type DialectLocale = z.infer<typeof DialectLocaleSchema>;

export const InputModalitySchema = z.enum(['VOICE_STT', 'TEXT_TALKBACK']);
export type InputModality = z.infer<typeof InputModalitySchema>;

export const AssistantInterpretRequestSchema = z
  .object({
    sessionId: z.string().uuid(),
    text: z.string().min(1).max(500),
    dialectLocale: DialectLocaleSchema,
    clientTimestamp: z.string().datetime(),
    inputModality: InputModalitySchema,
  })
  .strict();
export type AssistantInterpretRequest = z.infer<typeof AssistantInterpretRequestSchema>;

// ==========================================
// 2. Structured Action Contracts
// ==========================================

export const IntentIdSchema = z.enum([
  // Core Active Intents
  'INTENT_ASSISTANT_QUERY',
  'INTENT_ALIAS_SET',
  'INTENT_ALIAS_LIST',
  'INTENT_ALIAS_DELETE',
  'INTENT_ALIAS_CLEAR_ALL',
  'INTENT_ACTION_CONFIRM',
  'INTENT_ACTION_CANCEL',
  // Gated Intents
  'INTENT_CONTACT_CALL',
  'INTENT_MESSAGE_SEND',
  'INTENT_LOCATION_QUERY',
  'INTENT_LOCATION_SHARE',
  'INTENT_CALENDAR_QUERY',
  'INTENT_CALENDAR_CREATE',
  'INTENT_EMERGENCY_TRIGGER',
]);
export type IntentId = z.infer<typeof IntentIdSchema>;

export const StructuredActionSchema = z
  .object({
    intentId: IntentIdSchema,
    targetCapability: CapabilityIdSchema,
    confidence: z.number().min(0).max(1),
    slots: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
    requiresConfirmation: z.boolean().default(false),
    rawUtteranceSanitized: z.string(),
  })
  .strict();
export type StructuredAction = z.infer<typeof StructuredActionSchema>;

export const AssistantInterpretResponseSchema = z
  .object({
    success: z.boolean(),
    candidateToken: z.string().optional(),
    actionCandidate: StructuredActionSchema.optional(),
    isAmbiguous: z.boolean().default(false),
    disambiguationOptions: z.array(z.string()).optional(),
    explanationArabic: z.string(),
  })
  .strict();
export type AssistantInterpretResponse = z.infer<typeof AssistantInterpretResponseSchema>;

// ==========================================
// 3. Policy Evaluation Contracts
// ==========================================

export const DeviceContextSchema = z
  .object({
    deviceId: z.string().min(1),
    appVersion: z.string(),
    osPermissionsGranted: z.array(z.string()),
    networkState: z.enum(['ONLINE_WIFI', 'ONLINE_CELLULAR', 'OFFLINE']).default('ONLINE_CELLULAR'),
    batteryLevelPercent: z.number().min(0).max(100).optional(),
    isLowBattery: z.boolean().default(false),
  })
  .strict();
export type DeviceContext = z.infer<typeof DeviceContextSchema>;

export const PolicyEvaluationRequestSchema = z
  .object({
    candidateToken: z.string().optional(),
    action: StructuredActionSchema,
    deviceContext: DeviceContextSchema,
  })
  .strict();
export type PolicyEvaluationRequest = z.infer<typeof PolicyEvaluationRequestSchema>;

export const PolicyDecisionStatusSchema = z.enum(['ALLOWED', 'CONFIRMATION_REQUIRED', 'DENIED']);
export type PolicyDecisionStatus = z.infer<typeof PolicyDecisionStatusSchema>;

export const EarconAudioCueSchema = z.enum([
  'EARCON_LISTENING_START',
  'EARCON_THINKING',
  'EARCON_CONFIRM_CHALLENGE',
  'EARCON_SUCCESS',
  'EARCON_CANCELLED',
  'EARCON_ERROR',
  'EARCON_EMERGENCY_COUNTDOWN',
]);
export type EarconAudioCue = z.infer<typeof EarconAudioCueSchema>;

export const PolicyEvaluationResponseSchema = z
  .object({
    status: PolicyDecisionStatusSchema,
    riskTier: RiskTierSchema.optional(),
    reasonCode: z.string(),
    executionGrantToken: z.string().optional(),
    confirmationToken: z.string().optional(),
    arabicPrompt: z.string().optional(),
    arabicExplanation: z.string().optional(),
    promptAudioCue: EarconAudioCueSchema.optional(),
    expiresAt: z.string().datetime().optional(),
    timeoutMs: z.number().positive().optional(),
    actionTaken: z.string().optional(),
  })
  .strict();
export type PolicyEvaluationResponse = z.infer<typeof PolicyEvaluationResponseSchema>;

// ==========================================
// 4. Confirmation Resolution Contracts
// ==========================================

export const ConfirmationResponseEnum = z.enum(['AFFIRMATIVE', 'NEGATIVE', 'CANCEL', 'TIMEOUT']);
export type ConfirmationResponse = z.infer<typeof ConfirmationResponseEnum>;

export const ConfirmationResolutionRequestSchema = z
  .object({
    confirmationToken: z.string().min(10),
    userResponse: ConfirmationResponseEnum,
    responseTimestamp: z.string().datetime(),
  })
  .strict();
export type ConfirmationResolutionRequest = z.infer<typeof ConfirmationResolutionRequestSchema>;

export const ConfirmationResolutionResponseSchema = z
  .object({
    status: z.enum(['CONFIRMED', 'CANCELLED', 'EXPIRED', 'DENIED']),
    executionGrantToken: z.string().optional(),
    arabicMessage: z.string(),
    audioCue: EarconAudioCueSchema,
    expiresAt: z.string().datetime().optional(),
  })
  .strict();
export type ConfirmationResolutionResponse = z.infer<typeof ConfirmationResolutionResponseSchema>;

// ==========================================
// 5. Tool Execution Contracts
// ==========================================

export const ToolExecutionRequestSchema = z
  .object({
    toolName: z.string().min(1),
    executionGrantToken: z.string().min(10),
    parameters: z.record(z.string(), z.unknown()),
  })
  .strict();
export type ToolExecutionRequest = z.infer<typeof ToolExecutionRequestSchema>;

export const ToolExecutionResponseSchema = z
  .object({
    success: z.boolean(),
    resultData: z.record(z.string(), z.unknown()).optional(),
    feedbackArabic: z.string(),
    audioCue: EarconAudioCueSchema,
  })
  .strict();
export type ToolExecutionResponse = z.infer<typeof ToolExecutionResponseSchema>;

// ==========================================
// 6. Standardized Error Contract
// ==========================================

export const SanadApiErrorSchema = z
  .object({
    errorCode: z.string(),
    statusCode: z.number().int().min(400).max(599),
    messageEnglish: z.string(),
    messageArabic: z.string(),
    timestamp: z.string().datetime(),
    incidentId: z.string(),
    isRecoverable: z.boolean(),
  })
  .strict();
export type SanadApiError = z.infer<typeof SanadApiErrorSchema>;
