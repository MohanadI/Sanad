import { z } from 'zod';

export const CAPABILITIES = {
  // Active Core Capabilities
  CAP_ASSISTANT_QUERY: 'CAP_ASSISTANT_QUERY',
  CAP_ALIAS_MANAGE: 'CAP_ALIAS_MANAGE',
  CAP_SETTINGS_ACCESSIBILITY: 'CAP_SETTINGS_ACCESSIBILITY',
  CAP_AUDIT_INSPECT: 'CAP_AUDIT_INSPECT',
  CAP_ACTION_CANCEL: 'CAP_ACTION_CANCEL',

  // Gated / Deferred Capabilities (Strictly disabled)
  CAP_CONTACT_CALL: 'CAP_CONTACT_CALL',
  CAP_MESSAGE_SEND: 'CAP_MESSAGE_SEND',
  CAP_LOCATION_READ: 'CAP_LOCATION_READ',
  CAP_LOCATION_SHARE: 'CAP_LOCATION_SHARE',
  CAP_CALENDAR_READ: 'CAP_CALENDAR_READ',
  CAP_CALENDAR_WRITE: 'CAP_CALENDAR_WRITE',
  CAP_EMERGENCY_TRIGGER: 'CAP_EMERGENCY_TRIGGER',
} as const;

export type CapabilityId = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

export const CapabilityIdSchema = z.enum([
  'CAP_ASSISTANT_QUERY',
  'CAP_ALIAS_MANAGE',
  'CAP_SETTINGS_ACCESSIBILITY',
  'CAP_AUDIT_INSPECT',
  'CAP_ACTION_CANCEL',
  'CAP_CONTACT_CALL',
  'CAP_MESSAGE_SEND',
  'CAP_LOCATION_READ',
  'CAP_LOCATION_SHARE',
  'CAP_CALENDAR_READ',
  'CAP_CALENDAR_WRITE',
  'CAP_EMERGENCY_TRIGGER',
]);

export const RISK_TIERS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type RiskTier = (typeof RISK_TIERS)[keyof typeof RISK_TIERS];

export const RiskTierSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

/**
 * Authoritative Server-Side Confirmation Rules (ADR-004)
 * Governs whether user confirmation is required.
 * Evaluator strictly ignores any client- or AI-provided requiresConfirmation flags.
 */
export const CAPABILITY_CONFIRMATION_RULES = {
  CAP_ASSISTANT_QUERY: 'NEVER',
  CAP_ALIAS_MANAGE: 'ALWAYS',
  CAP_SETTINGS_ACCESSIBILITY: 'NEVER',
  CAP_AUDIT_INSPECT: 'NEVER',
  CAP_ACTION_CANCEL: 'NEVER',
  CAP_CONTACT_CALL: 'ALWAYS',
  CAP_MESSAGE_SEND: 'ALWAYS',
  CAP_LOCATION_READ: 'ALWAYS',
  CAP_LOCATION_SHARE: 'ALWAYS',
  CAP_CALENDAR_READ: 'NEVER',
  CAP_CALENDAR_WRITE: 'ALWAYS',
  CAP_EMERGENCY_TRIGGER: 'ALWAYS',
} as const;

export type ConfirmationPolicy =
  (typeof CAPABILITY_CONFIRMATION_RULES)[keyof typeof CAPABILITY_CONFIRMATION_RULES];

export interface CapabilityMeta {
  readonly enabled: boolean;
  readonly requiresAuth: boolean;
  readonly riskTier: RiskTier;
  readonly defaultRequiresConfirmation: boolean;
  readonly reason?: string;
}

export const CAPABILITY_CONFIG: Record<CapabilityId, CapabilityMeta> = {
  CAP_ASSISTANT_QUERY: {
    enabled: true,
    requiresAuth: true,
    riskTier: 'LOW',
    defaultRequiresConfirmation: false,
  },
  CAP_ALIAS_MANAGE: {
    enabled: true,
    requiresAuth: true,
    riskTier: 'LOW',
    defaultRequiresConfirmation: true, // ADR-004: Always require confirmation
  },
  CAP_SETTINGS_ACCESSIBILITY: {
    enabled: true,
    requiresAuth: false,
    riskTier: 'LOW',
    defaultRequiresConfirmation: false,
  },
  CAP_AUDIT_INSPECT: {
    enabled: true,
    requiresAuth: true,
    riskTier: 'LOW',
    defaultRequiresConfirmation: false,
  },
  CAP_ACTION_CANCEL: {
    enabled: true,
    requiresAuth: false,
    riskTier: 'LOW',
    defaultRequiresConfirmation: false,
  },

  // Deferred & Gated Capabilities
  CAP_CONTACT_CALL: {
    enabled: false,
    requiresAuth: true,
    riskTier: 'HIGH',
    defaultRequiresConfirmation: true,
    reason: 'DEFERRED_PHASE_1_GOVERNANCE',
  },
  CAP_MESSAGE_SEND: {
    enabled: false,
    requiresAuth: true,
    riskTier: 'HIGH',
    defaultRequiresConfirmation: true,
    reason: 'DEFERRED_PHASE_1_GOVERNANCE',
  },
  CAP_LOCATION_READ: {
    enabled: false,
    requiresAuth: true,
    riskTier: 'MEDIUM',
    defaultRequiresConfirmation: true, // ADR-004: Always require confirmation
    reason: 'DEFERRED_PHASE_1_GOVERNANCE',
  },
  CAP_LOCATION_SHARE: {
    enabled: false,
    requiresAuth: true,
    riskTier: 'HIGH',
    defaultRequiresConfirmation: true,
    reason: 'DEFERRED_PHASE_1_GOVERNANCE',
  },
  CAP_CALENDAR_READ: {
    enabled: false,
    requiresAuth: true,
    riskTier: 'LOW',
    defaultRequiresConfirmation: false,
    reason: 'DEFERRED_PHASE_1_GOVERNANCE',
  },
  CAP_CALENDAR_WRITE: {
    enabled: false,
    requiresAuth: true,
    riskTier: 'MEDIUM',
    defaultRequiresConfirmation: true, // ADR-004: Always require confirmation
    reason: 'DEFERRED_PHASE_1_GOVERNANCE',
  },
  CAP_EMERGENCY_TRIGGER: {
    enabled: false,
    requiresAuth: true,
    riskTier: 'CRITICAL',
    defaultRequiresConfirmation: true,
    reason: 'DEFERRED_PHASE_1_GOVERNANCE',
  },
} as const;
