/**
 * Sanad Security Test Suite: Policy Boundary & Authorization Gates
 * 
 * Verifies findings:
 * - SEC-P0-01: Confirmation suppression bypass in Policy Engine
 * - SEC-P2-01: Semantic contact shadowing / keyword blacklist
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Canonical Capability Definitions
export type CapabilityId =
  | 'CAP_ASSISTANT_QUERY'
  | 'CAP_ALIAS_MANAGE'
  | 'CAP_SETTINGS_ACCESSIBILITY'
  | 'CAP_AUDIT_INSPECT'
  | 'CAP_ACTION_CANCEL'
  | 'CAP_CONTACT_CALL'
  | 'CAP_MESSAGE_SEND'
  | 'CAP_LOCATION_READ'
  | 'CAP_LOCATION_SHARE'
  | 'CAP_CALENDAR_READ'
  | 'CAP_CALENDAR_WRITE'
  | 'CAP_EMERGENCY_TRIGGER';

export type ConfirmationPolicy = 'ALWAYS' | 'CONDITIONAL' | 'NEVER';

// Secure Reference Configuration (Proposed Remediation for SEC-P0-01 & SEC-P2-01)
export const AUTHORITATIVE_CONFIRMATION_RULES: Record<CapabilityId, ConfirmationPolicy> = {
  CAP_ASSISTANT_QUERY: 'NEVER',
  CAP_ALIAS_MANAGE: 'ALWAYS',       // Fixed: Must confirm all alias modifications to prevent hijacking
  CAP_SETTINGS_ACCESSIBILITY: 'NEVER',
  CAP_AUDIT_INSPECT: 'NEVER',
  CAP_ACTION_CANCEL: 'NEVER',
  CAP_CONTACT_CALL: 'ALWAYS',
  CAP_MESSAGE_SEND: 'ALWAYS',
  CAP_LOCATION_READ: 'ALWAYS',      // Fixed: Must confirm before vocalizing location in public
  CAP_LOCATION_SHARE: 'ALWAYS',
  CAP_CALENDAR_READ: 'NEVER',
  CAP_CALENDAR_WRITE: 'ALWAYS',     // Fixed: MEDIUM risk calendar writes must require confirmation
  CAP_EMERGENCY_TRIGGER: 'ALWAYS',  // Special 5s countdown protocol
};

export const RESERVED_SYSTEM_KEYWORDS = new Set([
  'طوارئ',
  'إسعاف',
  'شرطة',
  'إلغاء',
  'وقف',
  'نجدة',
]);

export interface PolicyEvaluationInput {
  targetCapability: CapabilityId;
  clientRequiresConfirmation?: boolean;
  slots?: Record<string, unknown>;
}

export function evaluateConfirmationRequirement(input: PolicyEvaluationInput): boolean {
  // CRITICAL SECURITY ASSERTION:
  // Policy engine MUST NOT trust input.clientRequiresConfirmation.
  // Must lookup authoritative server-side rule:
  const rule = AUTHORITATIVE_CONFIRMATION_RULES[input.targetCapability];
  if (rule === 'ALWAYS') {
    return true;
  }
  if (rule === 'NEVER') {
    return false;
  }
  // If conditional, evaluate business rules deterministically
  return true;
}

export function validateAliasRegistration(aliasName: string): { valid: boolean; reason?: string } {
  const normalized = aliasName.trim();
  if (RESERVED_SYSTEM_KEYWORDS.has(normalized)) {
    return {
      valid: false,
      reason: 'POLICY_ERR_RESERVED_KEYWORD_CANNOT_BE_ALIAS',
    };
  }
  return { valid: true };
}

describe('Security Verification: Policy Boundary & Authorization', () => {
  it('SEC-P0-01: Must mandate confirmation for CAP_CALENDAR_WRITE even if client/AI passes requiresConfirmation=false', () => {
    const maliciousInput: PolicyEvaluationInput = {
      targetCapability: 'CAP_CALENDAR_WRITE',
      clientRequiresConfirmation: false, // Attempted suppression
      slots: { title: 'Unauthorized Event' },
    };

    const requiresConfirmation = evaluateConfirmationRequirement(maliciousInput);
    assert.equal(
      requiresConfirmation,
      true,
      'Policy engine must force confirmation on CAP_CALENDAR_WRITE regardless of client flag.'
    );
  });

  it('SEC-P0-01: Must mandate confirmation for all sensitive capabilities (CALL, MESSAGE, LOCATION, CALENDAR_WRITE)', () => {
    const sensitiveCapabilities: CapabilityId[] = [
      'CAP_CONTACT_CALL',
      'CAP_MESSAGE_SEND',
      'CAP_LOCATION_SHARE',
      'CAP_CALENDAR_WRITE',
      'CAP_EMERGENCY_TRIGGER',
    ];

    for (const cap of sensitiveCapabilities) {
      const result = evaluateConfirmationRequirement({
        targetCapability: cap,
        clientRequiresConfirmation: false,
      });
      assert.equal(
        result,
        true,
        `Capability ${cap} must strictly mandate user confirmation.`
      );
    }
  });

  it('SEC-P2-01: Must block attempts to register emergency/system keywords as contact aliases (Contact Hijacking)', () => {
    for (const keyword of RESERVED_SYSTEM_KEYWORDS) {
      const validation = validateAliasRegistration(keyword);
      assert.equal(
        validation.valid,
        false,
        `Keyword "${keyword}" must be forbidden as a contact alias.`
      );
      assert.equal(validation.reason, 'POLICY_ERR_RESERVED_KEYWORD_CANNOT_BE_ALIAS');
    }
  });

  it('SEC-P2-01: Valid alias names pass keyword check but require mandatory confirmation', () => {
    const validation = validateAliasRegistration('أخوي أحمد');
    assert.equal(validation.valid, true);

    const requiresConfirmation = evaluateConfirmationRequirement({
      targetCapability: 'CAP_ALIAS_MANAGE',
      clientRequiresConfirmation: false,
    });
    assert.equal(
      requiresConfirmation,
      true,
      'Alias creation must strictly require explicit confirmation to prevent silent injection.'
    );
  });
});
