/**
 * Sanad Security Test Suite: Tool Parameter Binding & Tampering Defenses
 * 
 * Verifies finding:
 * - SEC-P0-02: Tool Parameter Tampering & Action Substitution via Unbound executionGrantToken
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

export interface ExecutionAuthToken {
  actionId: string;
  userId: string;
  toolName: string;
  actionHash: string; // SHA-256(toolName + canonical(parameters))
  nonce: string;
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJson).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return (
    '{' +
    keys
      .map(
        (key) =>
          JSON.stringify(key) +
          ':' +
          canonicalizeJson((obj as Record<string, unknown>)[key])
      )
      .join(',') +
    '}'
  );
}

export function computeActionHash(toolName: string, parameters: unknown): string {
  const canonicalString = toolName + ':' + canonicalizeJson(parameters);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

export function createExecutionGrant(
  signingKey: string,
  userId: string,
  toolName: string,
  parameters: unknown,
  ttlMs = 10000
): ExecutionAuthToken {
  const now = Date.now();
  const actionHash = computeActionHash(toolName, parameters);
  const nonce = crypto.randomUUID();
  const actionId = crypto.randomUUID();
  const payload = `${actionId}.${userId}.${toolName}.${actionHash}.${nonce}.${now}.${now + ttlMs}`;
  const signature = crypto.createHmac('sha256', signingKey).update(payload).digest('hex');

  return {
    actionId,
    userId,
    toolName,
    actionHash,
    nonce,
    issuedAt: now,
    expiresAt: now + ttlMs,
    signature,
  };
}

export function verifyToolExecutionBinding(
  signingKey: string,
  requestedTool: string,
  requestedParameters: unknown,
  token: ExecutionAuthToken
): { authorized: boolean; errorCode?: string } {
  // 1. Verify token signature
  const expectedPayload = `${token.actionId}.${token.userId}.${token.toolName}.${token.actionHash}.${token.nonce}.${token.issuedAt}.${token.expiresAt}`;
  const computedSignature = crypto
    .createHmac('sha256', signingKey)
    .update(expectedPayload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(token.signature))) {
    return { authorized: false, errorCode: 'ERR_TOKEN_SIGNATURE_INVALID' };
  }

  // 2. Check expiration
  if (Date.now() > token.expiresAt) {
    return { authorized: false, errorCode: 'ERR_TOKEN_EXPIRED' };
  }

  // 3. Check tool binding
  if (token.toolName !== requestedTool) {
    return { authorized: false, errorCode: 'ERR_TOOL_MISMATCH' };
  }

  // 4. CRITICAL: Check parameter hash binding
  const currentParamsHash = computeActionHash(requestedTool, requestedParameters);
  if (currentParamsHash !== token.actionHash) {
    return { authorized: false, errorCode: 'ERR_PARAMETERS_TAMPERED' };
  }

  return { authorized: true };
}

describe('Security Verification: Token Parameter Binding & Tampering Protection', () => {
  const serverKey = 'test_secure_ephemeral_hmac_secret_2026';
  const userId = 'usr_test_123';
  const toolName = 'TOOL_ALIAS_REGISTER';
  const legitimateParams = {
    aliasName: 'مرتي',
    contactId: 'cnt_legitimate_contact_id_550e8400',
  };

  it('SEC-P0-02: Valid token and untampered parameters must be authorized', () => {
    const token = createExecutionGrant(serverKey, userId, toolName, legitimateParams);
    const verification = verifyToolExecutionBinding(serverKey, toolName, legitimateParams, token);

    assert.equal(verification.authorized, true);
  });

  it('SEC-P0-02: Parameter substitution (changing contactId) must be detected and rejected', () => {
    const token = createExecutionGrant(serverKey, userId, toolName, legitimateParams);

    // Attacker modifies contactId to point to an attacker-controlled target
    const tamperedParams = {
      aliasName: 'مرتي',
      contactId: 'cnt_ATTACKER_TARGET_99999999',
    };

    const verification = verifyToolExecutionBinding(serverKey, toolName, tamperedParams, token);

    assert.equal(verification.authorized, false);
    assert.equal(verification.errorCode, 'ERR_PARAMETERS_TAMPERED');
  });

  it('SEC-P0-02: Tool mismatch (using token for another tool) must be rejected', () => {
    const token = createExecutionGrant(serverKey, userId, toolName, legitimateParams);

    // Attacker uses token to invoke a different tool
    const verification = verifyToolExecutionBinding(
      serverKey,
      'TOOL_CALENDAR_CREATE',
      legitimateParams,
      token
    );

    assert.equal(verification.authorized, false);
    assert.equal(verification.errorCode, 'ERR_TOOL_MISMATCH');
  });

  it('SEC-P0-02: Expired tokens must be rejected', () => {
    // Generate token with -1ms TTL (already expired)
    const token = createExecutionGrant(serverKey, userId, toolName, legitimateParams, -100);

    const verification = verifyToolExecutionBinding(serverKey, toolName, legitimateParams, token);

    assert.equal(verification.authorized, false);
    assert.equal(verification.errorCode, 'ERR_TOKEN_EXPIRED');
  });
});
