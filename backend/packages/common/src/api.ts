import { z } from 'zod';
import { StructuredActionCandidateSchema } from './actions.js';
import { CapabilityIdSchema, RiskTierSchema } from './capabilities.js';
import { DIALECT_LOCALES } from './i18n.js';

export const DialectLocaleSchema = z.enum([
  DIALECT_LOCALES.GAZA,
  DIALECT_LOCALES.WEST_BANK,
  DIALECT_LOCALES.JERUSALEM,
  DIALECT_LOCALES.STANDARD,
]);

export const InputModalitySchema = z.enum(['VOICE_STT', 'TEXT_TALKBACK']);

export const UserResponseSchema = z.enum(['AFFIRMATIVE', 'NEGATIVE', 'CANCEL', 'TIMEOUT']);
export type UserResponse = z.infer<typeof UserResponseSchema>;

// Interpret Endpoint
export const AssistantInterpretRequestSchema = z
  .object({
    sessionId: z.string().min(1),
    text: z.string().min(1).max(1000),
    dialectLocale: DialectLocaleSchema,
    clientTimestamp: z.string().datetime(),
    inputModality: InputModalitySchema,
  })
  .strict();

export type AssistantInterpretRequest = z.infer<typeof AssistantInterpretRequestSchema>;

export const AssistantInterpretResponseSchema = z
  .object({
    success: z.boolean(),
    candidateToken: z.string().min(1).optional(),
    actionCandidate: StructuredActionCandidateSchema,
    explanationArabic: z.string(),
    messageKey: z.string().optional(),
  })
  .strict();

export type AssistantInterpretResponse = z.infer<typeof AssistantInterpretResponseSchema>;

// Policy Evaluate Endpoint
export const DeviceContextSchema = z
  .object({
    deviceId: z.string().min(1),
    appVersion: z.string().min(1),
    osPermissionsGranted: z.array(z.string()),
  })
  .strict();

export type DeviceContext = z.infer<typeof DeviceContextSchema>;

export const PolicyEvaluateRequestSchema = z
  .object({
    candidateToken: z.string().min(1).optional(),
    action: z
      .object({
        intentId: z.string().min(1),
        targetCapability: CapabilityIdSchema,
        slots: z.record(z.unknown()),
        requiresConfirmation: z.boolean().optional(),
      })
      .strict(),
    deviceContext: DeviceContextSchema,
  })
  .strict();

export type PolicyEvaluateRequest = z.infer<typeof PolicyEvaluateRequestSchema>;

export const PolicyEvaluateResponseSchema = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('ALLOWED'),
      riskTier: RiskTierSchema,
      executionGrantToken: z.string().min(1),
      expiresAt: z.string().datetime(),
      messageKey: z.string().optional(),
    })
    .strict(),
  z
    .object({
      status: z.literal('CONFIRMATION_REQUIRED'),
      riskTier: RiskTierSchema,
      confirmationToken: z.string().min(1),
      arabicPrompt: z.string(),
      promptAudioCue: z.string().optional(),
      expiresAt: z.string().datetime(),
      messageKey: z.string().optional(),
    })
    .strict(),
  z
    .object({
      status: z.literal('DENIED'),
      reasonCode: z.string(),
      arabicExplanation: z.string(),
      actionTaken: z.literal('REJECTED_AUDITED'),
      messageKey: z.string().optional(),
    })
    .strict(),
]);

export type PolicyEvaluateResponse = z.infer<typeof PolicyEvaluateResponseSchema>;

// Policy Confirm Endpoint
export const PolicyConfirmRequestSchema = z
  .object({
    confirmationToken: z.string().min(1),
    userResponse: UserResponseSchema,
    responseTimestamp: z.string().datetime(),
  })
  .strict();

export type PolicyConfirmRequest = z.infer<typeof PolicyConfirmRequestSchema>;

export const PolicyConfirmResponseSchema = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('CONFIRMED'),
      executionGrantToken: z.string().min(1),
      expiresAt: z.string().datetime(),
      messageKey: z.string().optional(),
    })
    .strict(),
  z
    .object({
      status: z.literal('CANCELLED'),
      arabicMessage: z.string(),
      audioCue: z.string().optional(),
      messageKey: z.string().optional(),
    })
    .strict(),
]);

export type PolicyConfirmResponse = z.infer<typeof PolicyConfirmResponseSchema>;

// Tool Execute Endpoint
export const ToolExecuteRequestSchema = z
  .object({
    toolName: z.string().min(1),
    executionGrantToken: z.string().min(1),
    parameters: z.record(z.unknown()),
  })
  .strict();

export type ToolExecuteRequest = z.infer<typeof ToolExecuteRequestSchema>;

export const ToolExecuteResponseSchema = z
  .object({
    success: z.boolean(),
    resultData: z.record(z.unknown()).optional(),
    feedbackArabic: z.string(),
    audioCue: z.string().optional(),
    messageKey: z.string().optional(),
  })
  .strict();

export type ToolExecuteResponse = z.infer<typeof ToolExecuteResponseSchema>;

// Standardized Error Response Schema
export const SanadApiErrorSchema = z
  .object({
    errorCode: z.string(),
    statusCode: z.number().int().min(400).max(599),
    messageEnglish: stringSchema('messageEnglish'),
    messageArabic: stringSchema('messageArabic'),
    timestamp: z.string().datetime(),
    incidentId: z.string(),
    isRecoverable: z.boolean(),
    messageKey: z.string().optional(),
  })
  .strict();

function stringSchema(name: string) {
  return z.string().min(1, `${name} must not be empty`);
}

export type SanadApiError = z.infer<typeof SanadApiErrorSchema>;
