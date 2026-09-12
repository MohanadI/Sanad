import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TokenService } from '../src/tokens.js';
import { SecurityTokenError } from '@sanad/common';

describe('TokenService (HMAC-SHA256 Token Lifecycle & Anti-Replay)', () => {
  const secretKey = 'test-secret-key-32-bytes-long-super-safe';
  const tokenService = new TokenService({ secretKey, confirmationTtlSeconds: 1, grantTtlSeconds: 1 });

  describe('Confirmation Token Lifecycle', () => {
    it('should generate and successfully verify a confirmation token', () => {
      const actionId = '550e8400-e29b-41d4-a716-446655440000';
      const userId = 'usr_test_1';
      const actionHash = tokenService.computeActionHash('CAP_ALIAS_MANAGE', { aliasName: 'مرتي' });

      const { token } = tokenService.generateConfirmationToken(
        actionId,
        userId,
        'CAP_ALIAS_MANAGE',
        actionHash
      );

      assert.ok(token.startsWith('ct_'));
      const payload = tokenService.verifyConfirmationToken(token);
      assert.equal(payload.actionId, actionId);
      assert.equal(payload.userId, userId);
      assert.equal(payload.actionHash, actionHash);
    });

    it('should reject tampered token signatures', () => {
      const { token } = tokenService.generateConfirmationToken(
        '550e8400-e29b-41d4-a716-446655440000',
        'usr_test_1',
        'CAP_ALIAS_MANAGE',
        'a'.repeat(64)
      );

      const tampered = token.slice(0, -4) + 'zzzz';
      assert.throws(() => {
        tokenService.verifyConfirmationToken(tampered);
      }, SecurityTokenError);
    });

    it('should prevent replay attacks by rejecting duplicate token consumption', () => {
      const { token } = tokenService.generateConfirmationToken(
        '550e8400-e29b-41d4-a716-446655440000',
        'usr_test_1',
        'CAP_ALIAS_MANAGE',
        'b'.repeat(64)
      );

      // First consumption: success
      const payload1 = tokenService.verifyConfirmationToken(token);
      assert.ok(payload1);

      // Second consumption: MUST throw replay error
      assert.throws(() => {
        tokenService.verifyConfirmationToken(token);
      }, /replay/i);
    });

    it('should reject expired tokens', async () => {
      const shortLivedService = new TokenService({ secretKey, confirmationTtlSeconds: 0.05 });
      const { token } = shortLivedService.generateConfirmationToken(
        '550e8400-e29b-41d4-a716-446655440000',
        'usr_test_1',
        'CAP_ALIAS_MANAGE',
        'c'.repeat(64)
      );

      // Wait 80ms for expiration
      await new Promise((r) => setTimeout(r, 80));

      assert.throws(() => {
        shortLivedService.verifyConfirmationToken(token);
      }, /expired/i);
    });
  });

  describe('Execution Grant Token Lifecycle', () => {
    it('should generate and verify execution grant tokens bound to tools', () => {
      const actionId = '550e8400-e29b-41d4-a716-446655440000';
      const userId = 'usr_test_1';
      const actionHash = 'd'.repeat(64);

      const { token } = tokenService.generateExecutionGrantToken(
        actionId,
        userId,
        'CAP_ASSISTANT_QUERY',
        'TOOL_ASSISTANT_QUERY',
        actionHash
      );

      assert.ok(token.startsWith('gt_'));
      const payload = tokenService.verifyExecutionGrantToken(token);
      assert.equal(payload.toolName, 'TOOL_ASSISTANT_QUERY');
      assert.equal(payload.targetCapability, 'CAP_ASSISTANT_QUERY');
    });
  });
});
