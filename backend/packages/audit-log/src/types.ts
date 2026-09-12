import { z } from 'zod';
import { CapabilityIdSchema, RiskTierSchema, type CapabilityId, type RiskTier } from '@sanad/common';

export const AuditDecisionSchema = z.enum(['ALLOWED', 'CONFIRMATION_REQUIRED', 'DENIED']);
export type AuditDecision = z.infer<typeof AuditDecisionSchema>;

export const ExecutionStatusSchema = z.enum(['SUCCESS', 'FAILED', 'ABORTED', 'NOT_APPLICABLE']);
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export const FORBIDDEN_PHONE_KEYS = new Set([
  'phone',
  'phonehash',
  'msisdn',
  'phonenumber',
  'mobile',
]);

export const PALESTINIAN_PHONE_REGEX = /(?:\+97[02]|05[69])\d{7,8}/;

export function isSecureAuditEntry(entry: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(entry)) {
    if (FORBIDDEN_PHONE_KEYS.has(key.toLowerCase())) {
      return false;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!isSecureAuditEntry(value as Record<string, unknown>)) {
        return false;
      }
    }
    if (typeof value === 'string') {
      const normalized = value.replace(/[\s\-()]/g, '');
      if (PALESTINIAN_PHONE_REGEX.test(normalized)) {
        return false;
      }
    }
  }
  return true;
}

export const AuditEventSchema = z
  .object({
    eventId: z.string().uuid(),
    timestamp: z.string().datetime(),
    userId: z.string().min(1),
    sessionId: z.string().optional(),
    requestedCapability: CapabilityIdSchema,
    intentId: z.string().min(1),
    policyDecision: AuditDecisionSchema,
    reasonCode: z.string().min(1),
    executionStatus: ExecutionStatusSchema,
    riskTier: RiskTierSchema,
    sanitizedMetadata: z.record(z.unknown()),
  })
  .strict()
  .refine((event) => isSecureAuditEntry(event.sanitizedMetadata), {
    message: 'Zero-Phone Invariant Violation: Audit metadata cannot contain telephone numbers or phone hashes (ADR-006)',
  });

export type AuditEvent = z.infer<typeof AuditEventSchema>;

export interface AuditLogFilter {
  userId?: string;
  capability?: CapabilityId;
  decision?: AuditDecision;
  startTime?: string;
  endTime?: string;
  limit?: number;
}

export interface AuditLogger {
  /**
   * Appends an immutable audit event.
   * Enforces zero raw PII persistence.
   */
  log(event: AuditEvent): Promise<void>;

  /**
   * Queries audit events by filter (for compliance / user inspection).
   */
  query(filter: AuditLogFilter): Promise<readonly AuditEvent[]>;

  /**
   * Returns total count of logged events.
   */
  count(): Promise<number>;
}
