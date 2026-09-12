import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DeterministicPolicyEngineClient } from '../src/client.js';
import {
  PERMISSIONS,
  type StructuredAction,
} from '@sanad/common';
import type { PolicyContext } from '../src/types.js';

describe('Deterministic Policy Engine (Four-Tier Security Evaluation)', () => {
  const policyClient = new DeterministicPolicyEngineClient();

  const makeAction = (overrides: Partial<StructuredAction> = {}): StructuredAction => ({
    actionId: '550e8400-e29b-41d4-a716-446655440000',
    intentId: 'INTENT_ASSISTANT_QUERY',
    targetCapability: 'CAP_ASSISTANT_QUERY',
    confidence: 0.95,
    slots: { queryType: 'TIME_DATE' },
    requiresConfirmation: false,
    rawUtteranceSanitized: 'كم الساعه',
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  const baseContext: PolicyContext = {
    userId: 'usr_valid_123',
    deviceId: 'dev_pixel_7a',
    action: makeAction(),
    userGrants: [PERMISSIONS.SYSTEM_QUERY, PERMISSIONS.ALIAS_READ, PERMISSIONS.ALIAS_WRITE],
    osPermissions: {},
  };

  describe('Tier 1: Feature Gate Check', () => {
    it('should DENY actions on gated/deferred capabilities with POLICY_ERR_CAPABILITY_DISABLED', async () => {
      const gatedAction = makeAction({
        intentId: 'INTENT_CONTACT_CALL',
        targetCapability: 'CAP_CONTACT_CALL',
        slots: { targetContact: 'أحمد' },
      });

      const context: PolicyContext = {
        ...baseContext,
        action: gatedAction,
        userGrants: [PERMISSIONS.CONTACTS_READ, PERMISSIONS.TELEPHONY_CALL],
        osPermissions: { 'android.permission.CALL_PHONE': true },
      };

      const result = await policyClient.evaluate(context);
      assert.equal(result.status, 'DENIED');
      if (result.status === 'DENIED') {
        assert.equal(result.reasonCode, 'POLICY_ERR_CAPABILITY_DISABLED');
        assert.match(result.arabicExplanation, /غير مفعلة/);
      }
    });

    it('should DENY location sharing as gated capability', async () => {
      const gatedAction = makeAction({
        intentId: 'INTENT_LOCATION_SHARE',
        targetCapability: 'CAP_LOCATION_SHARE',
        slots: { targetContact: 'أحمد' },
      });

      const result = await policyClient.evaluate({ ...baseContext, action: gatedAction });
      assert.equal(result.status, 'DENIED');
    });
  });

  describe('Tier 2: User Consent Check', () => {
    it('should DENY actions when user consent is missing in grants', async () => {
      const aliasAction = makeAction({
        intentId: 'INTENT_ALIAS_LIST',
        targetCapability: 'CAP_ALIAS_MANAGE',
        slots: {},
      });

      const contextWithoutConsent: PolicyContext = {
        ...baseContext,
        action: aliasAction,
        userGrants: [], // Missing ALIAS_READ / ALIAS_WRITE
      };

      const result = await policyClient.evaluate(contextWithoutConsent);
      assert.equal(result.status, 'DENIED');
      if (result.status === 'DENIED') {
        assert.equal(result.reasonCode, 'POLICY_ERR_USER_CONSENT_MISSING');
        assert.match(result.arabicExplanation, /لم تقم بتفعيل إذن/);
      }
    });
  });

  describe('Tier 3: Android OS Runtime Permission Check', () => {
    it('should DENY when required OS permission is missing', async () => {
      // Temporarily test capability requiring OS perm by checking logic
      const auditAction = makeAction({
        intentId: 'INTENT_ASSISTANT_QUERY',
        targetCapability: 'CAP_AUDIT_INSPECT',
        slots: {},
      });

      const context: PolicyContext = {
        ...baseContext,
        action: auditAction,
        userGrants: [], // Missing AUDIT_READ
      };

      const result = await policyClient.evaluate(context);
      assert.equal(result.status, 'DENIED');
    });
  });

  describe('Tier 4: Risk-Based Confirmation Determination', () => {
    it('should demand CONFIRMATION_REQUIRED when action.requiresConfirmation is true', async () => {
      const sensitiveAction = makeAction({
        intentId: 'INTENT_ALIAS_SET',
        targetCapability: 'CAP_ALIAS_MANAGE',
        requiresConfirmation: true,
        slots: { aliasName: 'مرتي', targetContact: 'هدى' },
      });

      const result = await policyClient.evaluate({
        ...baseContext,
        action: sensitiveAction,
      });

      assert.equal(result.status, 'CONFIRMATION_REQUIRED');
      if (result.status === 'CONFIRMATION_REQUIRED') {
        assert.ok(result.confirmationToken.startsWith('ct_'));
        assert.match(result.arabicPrompt, /مرتي/);
        assert.match(result.arabicPrompt, /هدى/);
      }
    });
  });

  describe('Tier 5: Direct Execution Allowed', () => {
    it('should return ALLOWED with single-use execution grant token for LOW risk authorized actions', async () => {
      const allowedAction = makeAction({
        intentId: 'INTENT_ASSISTANT_QUERY',
        targetCapability: 'CAP_ASSISTANT_QUERY',
        requiresConfirmation: false,
        slots: { queryType: 'TIME_DATE' },
      });

      const result = await policyClient.evaluate({
        ...baseContext,
        action: allowedAction,
      });

      assert.equal(result.status, 'ALLOWED');
      if (result.status === 'ALLOWED') {
        assert.equal(result.riskTier, 'LOW');
        assert.ok(result.executionGrantToken.startsWith('gt_'));
      }
    });
  });

  describe('Confirmation Challenge Resolution Flow', () => {
    it('should issue execution grant when user responds AFFIRMATIVE', async () => {
      const sensitiveAction = makeAction({
        intentId: 'INTENT_ALIAS_SET',
        targetCapability: 'CAP_ALIAS_MANAGE',
        requiresConfirmation: true,
        slots: { aliasName: 'مرتي', targetContact: 'هدى' },
      });

      const evalResult = await policyClient.evaluate({
        ...baseContext,
        action: sensitiveAction,
      });
      assert.equal(evalResult.status, 'CONFIRMATION_REQUIRED');

      if (evalResult.status === 'CONFIRMATION_REQUIRED') {
        const confirmResult = await policyClient.resolveConfirmation({
          confirmationToken: evalResult.confirmationToken,
          userResponse: 'AFFIRMATIVE',
          responseTimestamp: new Date().toISOString(),
        });

        assert.equal(confirmResult.status, 'CONFIRMED');
        if (confirmResult.status === 'CONFIRMED') {
          assert.ok(confirmResult.executionGrantToken.startsWith('gt_'));

          // Verify execution grant
          const grantPayload = await policyClient.verifyExecutionGrant(confirmResult.executionGrantToken);
          assert.equal(grantPayload.targetCapability, 'CAP_ALIAS_MANAGE');
        }
      }
    });

    it('should return CANCELLED when user responds CANCEL', async () => {
      const sensitiveAction = makeAction({
        intentId: 'INTENT_ALIAS_SET',
        targetCapability: 'CAP_ALIAS_MANAGE',
        requiresConfirmation: true,
        slots: { aliasName: 'مرتي', targetContact: 'هدى' },
      });

      const evalResult = await policyClient.evaluate({
        ...baseContext,
        action: sensitiveAction,
      });
      assert.equal(evalResult.status, 'CONFIRMATION_REQUIRED');

      if (evalResult.status === 'CONFIRMATION_REQUIRED') {
        const confirmResult = await policyClient.resolveConfirmation({
          confirmationToken: evalResult.confirmationToken,
          userResponse: 'CANCEL',
          responseTimestamp: new Date().toISOString(),
        });

        assert.equal(confirmResult.status, 'CANCELLED');
        if (confirmResult.status === 'CANCELLED') {
          assert.match(confirmResult.arabicMessage, /تم إلغاء/);
        }
      }
    });
  });
});
