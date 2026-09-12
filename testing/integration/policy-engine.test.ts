import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DeterministicPolicyEvaluator, PolicyContext } from '../support/policy-evaluator.js';
import { MOCK_USER_ID, MOCK_SAMPLE_ACTIONS, MOCK_DEVICE_CONTEXT_VALID } from '../support/mock-data.js';
import { CAPABILITIES } from '@sanad/common';

describe('Policy Engine Test Suite: Deterministic Authorization & Token Lifecycle', () => {
  let evaluator: DeterministicPolicyEvaluator;

  beforeEach(() => {
    evaluator = new DeterministicPolicyEvaluator();
  });

  describe('Tier 1: Static Capability Gate Enforcement', () => {
    it('should strictly deny gated calling capability with POLICY_ERR_CAPABILITY_DISABLED', () => {
      const context: PolicyContext = {
        userId: MOCK_USER_ID,
        deviceId: MOCK_DEVICE_CONTEXT_VALID.deviceId,
        action: MOCK_SAMPLE_ACTIONS.gatedCall,
        userGrants: new Set(['sanad:perm:contacts:read', 'sanad:perm:telephony:call']),
        osPermissions: { 'android.permission.CALL_PHONE': true },
      };

      const result = evaluator.evaluate(context);
      assert.strictEqual(result.status, 'DENIED');
      assert.strictEqual(result.reasonCode, 'POLICY_ERR_CAPABILITY_DISABLED');
      assert.strictEqual(
        result.arabicExplanation,
        'هذه الميزة غير مفعلة حالياً في النظام حفاظاً على أمانك.'
      );
    });

    it('should strictly deny gated messaging capability', () => {
      const context: PolicyContext = {
        userId: MOCK_USER_ID,
        deviceId: MOCK_DEVICE_CONTEXT_VALID.deviceId,
        action: MOCK_SAMPLE_ACTIONS.gatedMessage,
        userGrants: new Set(['sanad:perm:contacts:read', 'sanad:perm:sms:send']),
        osPermissions: { 'android.permission.SEND_SMS': true },
      };

      const result = evaluator.evaluate(context);
      assert.strictEqual(result.status, 'DENIED');
      assert.strictEqual(result.reasonCode, 'POLICY_ERR_CAPABILITY_DISABLED');
    });

    it('should strictly deny gated emergency trigger capability', () => {
      const context: PolicyContext = {
        userId: MOCK_USER_ID,
        deviceId: MOCK_DEVICE_CONTEXT_VALID.deviceId,
        action: MOCK_SAMPLE_ACTIONS.gatedEmergency,
        userGrants: new Set(['sanad:perm:emergency:alert', 'sanad:perm:telephony:call']),
        osPermissions: { 'android.permission.CALL_PHONE': true },
      };

      const result = evaluator.evaluate(context);
      assert.strictEqual(result.status, 'DENIED');
      assert.strictEqual(result.reasonCode, 'POLICY_ERR_CAPABILITY_DISABLED');
    });
  });

  describe('Tier 2: User Consent & Permission Enforcement', () => {
    it('should allow assistant query when user consent is granted', () => {
      const context: PolicyContext = {
        userId: MOCK_USER_ID,
        deviceId: MOCK_DEVICE_CONTEXT_VALID.deviceId,
        action: MOCK_SAMPLE_ACTIONS.assistantQueryTime,
        userGrants: new Set(['sanad:perm:system:query']),
        osPermissions: {},
      };

      const result = evaluator.evaluate(context);
      assert.strictEqual(result.status, 'ALLOWED');
      assert.strictEqual(result.riskTier, 'LOW');
      assert.ok(result.executionGrantToken, 'Execution token must be emitted for allowed low-risk action');
    });

    it('should deny assistant query when user consent is missing', () => {
      const context: PolicyContext = {
        userId: MOCK_USER_ID,
        deviceId: MOCK_DEVICE_CONTEXT_VALID.deviceId,
        action: MOCK_SAMPLE_ACTIONS.assistantQueryTime,
        userGrants: new Set(), // Missing sanad:perm:system:query
        osPermissions: {},
      };

      const result = evaluator.evaluate(context);
      assert.strictEqual(result.status, 'DENIED');
      assert.strictEqual(result.reasonCode, 'POLICY_ERR_USER_CONSENT_MISSING');
      assert.strictEqual(
        result.arabicExplanation,
        'لم تقم بتفعيل إذن استخدام هذه الخاصية في الإعدادات.'
      );
    });

    it('should allow alias set without confirmation for brand new alias', () => {
      const context: PolicyContext = {
        userId: MOCK_USER_ID,
        deviceId: MOCK_DEVICE_CONTEXT_VALID.deviceId,
        action: MOCK_SAMPLE_ACTIONS.aliasSetNew,
        userGrants: new Set(['sanad:perm:alias:read', 'sanad:perm:alias:write']),
        osPermissions: {},
      };

      const result = evaluator.evaluate(context);
      assert.strictEqual(result.status, 'ALLOWED');
      assert.strictEqual(result.riskTier, 'LOW');
      assert.ok(result.executionGrantToken);
    });
  });

  describe('Tier 4: Risk-Based Confirmation State Machine', () => {
    it('should challenge user with confirmation token when action requires confirmation (overwrite)', () => {
      const context: PolicyContext = {
        userId: MOCK_USER_ID,
        deviceId: MOCK_DEVICE_CONTEXT_VALID.deviceId,
        action: MOCK_SAMPLE_ACTIONS.aliasSetOverwrite,
        userGrants: new Set(['sanad:perm:alias:read', 'sanad:perm:alias:write']),
        osPermissions: {},
      };

      const result = evaluator.evaluate(context);
      assert.strictEqual(result.status, 'CONFIRMATION_REQUIRED');
      assert.ok(result.confirmationToken);
      assert.ok(result.confirmationToken.startsWith('ct_'));
      assert.ok(result.arabicPrompt && result.arabicPrompt.includes('استبدال اللقب'));
      assert.strictEqual(result.promptAudioCue, 'EARCON_CONFIRM_CHALLENGE');
      assert.strictEqual(result.timeoutMs, 30000);
    });

    it('should challenge user when requesting high-risk purge action (clear all aliases)', () => {
      const context: PolicyContext = {
        userId: MOCK_USER_ID,
        deviceId: MOCK_DEVICE_CONTEXT_VALID.deviceId,
        action: MOCK_SAMPLE_ACTIONS.aliasClearAll,
        userGrants: new Set(['sanad:perm:alias:read', 'sanad:perm:alias:write']),
        osPermissions: {},
      };

      const result = evaluator.evaluate(context);
      assert.strictEqual(result.status, 'CONFIRMATION_REQUIRED');
      assert.ok(result.confirmationToken);
      assert.ok(result.arabicPrompt?.includes('حذف جميع الألقاب'));
    });
  });

  describe('Anti-Replay & Token Security Verification', () => {
    it('should verify valid confirmation token and permit single-use consumption', () => {
      const token = evaluator.generateConfirmationToken(
        MOCK_USER_ID,
        MOCK_SAMPLE_ACTIONS.aliasClearAll,
        30
      );

      // Verify token
      const verifyResult = evaluator.verifyToken(
        token,
        'CONFIRMATION',
        MOCK_SAMPLE_ACTIONS.aliasClearAll
      );
      assert.strictEqual(verifyResult.valid, true);

      // First consumption succeeds
      const firstConsume = evaluator.consumeToken(token, 'CONFIRMATION');
      assert.strictEqual(firstConsume, true);

      // Second consumption fails (Replay prevention)
      const secondConsume = evaluator.consumeToken(token, 'CONFIRMATION');
      assert.strictEqual(secondConsume, false, 'Replay attack must be thwarted by consumed nonce cache');

      const reVerifyResult = evaluator.verifyToken(token, 'CONFIRMATION');
      assert.strictEqual(reVerifyResult.valid, false);
      assert.strictEqual(reVerifyResult.reasonCode, 'TOKEN_ERR_REPLAY_CONSUMED');
    });

    it('should reject tampered token signatures', () => {
      const token = evaluator.generateConfirmationToken(
        MOCK_USER_ID,
        MOCK_SAMPLE_ACTIONS.aliasClearAll,
        30
      );
      const [payload, sig] = token.split('.');
      const tamperedToken = `${payload}.tampered_bogus_signature_abc`;

      const result = evaluator.verifyToken(tamperedToken, 'CONFIRMATION');
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.reasonCode, 'TOKEN_ERR_INVALID_SIGNATURE');
    });

    it('should reject tokens when action parameters are tampered with', () => {
      const token = evaluator.generateConfirmationToken(
        MOCK_USER_ID,
        MOCK_SAMPLE_ACTIONS.aliasClearAll,
        30
      );

      // Attempt to use this token for a different action
      const tamperedAction = {
        ...MOCK_SAMPLE_ACTIONS.aliasSetNew,
      };

      const result = evaluator.verifyToken(token, 'CONFIRMATION', tamperedAction);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.reasonCode, 'TOKEN_ERR_ACTION_TAMPERED');
    });

    it('should reject expired tokens (> 30 seconds TTL)', () => {
      // Generate token with 0 second TTL
      const expiredToken = evaluator.generateConfirmationToken(
        MOCK_USER_ID,
        MOCK_SAMPLE_ACTIONS.aliasClearAll,
        -1 // Expired 1 second ago
      );

      const result = evaluator.verifyToken(expiredToken, 'CONFIRMATION');
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.reasonCode, 'TOKEN_ERR_EXPIRED');
    });
  });
});
