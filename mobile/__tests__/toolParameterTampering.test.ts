import { BoundedToolExecutor } from '../src/capabilities/toolExecutor';
import { SecurityAuthorizationError } from '../src/capabilities/types';
import { TokenVerifier } from '../src/security/tokenVerifier';
import { computeActionHash, canonicalizeJson, sha256PureJs } from '../src/security/canonicalize';
import { auditLogger } from '../src/security/auditLogger';

describe('Tool Parameter Cryptographic Binding & Tampering Protection (ADR-004)', () => {
  beforeEach(() => {
    TokenVerifier.resetConsumedNonces();
    auditLogger.clearEvents();
  });

  it('computes deterministic canonical JSON regardless of key ordering', () => {
    const obj1 = { b: 'two', a: 'one', c: { z: 1, y: 2 } };
    const obj2 = { a: 'one', c: { y: 2, z: 1 }, b: 'two' };

    expect(canonicalizeJson(obj1)).toEqual(canonicalizeJson(obj2));
    expect(canonicalizeJson(obj1)).toBe('{"a":"one","b":"two","c":{"y":2,"z":1}}');
  });

  it('sha256PureJs matches reference standard test vectors', () => {
    // SHA-256 test vector: "" -> e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(sha256PureJs('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
    // SHA-256 test vector: "abc" -> ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    expect(sha256PureJs('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('executes tool when token actionHash matches canonical parameters', async () => {
    const parameters = { aliasName: 'دكتور العيون', contactId: 'cnt_888' };
    const grantToken = TokenVerifier.createBoundExecutionGrant(
      'CAP_ALIAS_MANAGE',
      parameters
    );

    const response = await BoundedToolExecutor.executeTool({
      toolName: 'TOOL_ALIAS_REGISTER',
      targetCapability: 'CAP_ALIAS_MANAGE',
      executionGrantToken: grantToken,
      parameters,
    });

    expect(response.success).toBe(true);
    expect(response.audioCue).toBe('EARCON_SUCCESS');
  });

  it('rejects execution when parameters are tampered with (SEC-P0-02)', async () => {
    const originalParameters = { aliasName: 'مرتي', contactId: 'cnt_safe_123' };
    const grantToken = TokenVerifier.createBoundExecutionGrant(
      'CAP_ALIAS_MANAGE',
      originalParameters
    );

    // Adversary tampers with contactId
    const tamperedParameters = { aliasName: 'مرتي', contactId: 'cnt_attacker_controlled_999' };

    await expect(
      BoundedToolExecutor.executeTool({
        toolName: 'TOOL_ALIAS_REGISTER',
        targetCapability: 'CAP_ALIAS_MANAGE',
        executionGrantToken: grantToken,
        parameters: tamperedParameters,
      })
    ).rejects.toThrow(SecurityAuthorizationError);

    // Verify denial was audited with reason code
    const events = auditLogger.getEvents();
    const lastEvent = events[events.length - 1];
    expect(lastEvent.policyDecision).toBe('DENIED');
    expect(lastEvent.reasonCode).toBe('POL_ERR_TOKEN_PARAMETER_HASH_MISMATCH');
  });

  it('rejects execution when actionHash was generated for a different capability', async () => {
    const parameters = { query: 'ما هو الوقت' };
    // Hash created for CAP_ASSISTANT_QUERY
    const grantToken = TokenVerifier.createBoundExecutionGrant(
      'CAP_ASSISTANT_QUERY',
      parameters
    );

    // Attempted use on CAP_ALIAS_MANAGE
    await expect(
      BoundedToolExecutor.executeTool({
        toolName: 'TOOL_ALIAS_REGISTER',
        targetCapability: 'CAP_ALIAS_MANAGE',
        executionGrantToken: grantToken,
        parameters: { aliasName: 'أمي', contactId: 'cnt_456' },
      })
    ).rejects.toThrow(SecurityAuthorizationError);
  });

  it('verifies signed JWT/HMAC token format with actionHash binding', () => {
    const params = { id: 'als_1' };
    const actionHash = computeActionHash('CAP_ALIAS_MANAGE', params);

    const payload = {
      type: 'EXECUTION_GRANT',
      actionId: 'act_101',
      userId: 'usr_local',
      targetCapability: 'CAP_ALIAS_MANAGE',
      toolName: 'TOOL_ALIAS_REMOVE',
      actionHash,
      nonce: 'nonce_backend_777',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10000).toISOString(),
    };

    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const token = `gt_${encoded}.mock_signature`;

    // Valid parameters
    const validResult = TokenVerifier.verifyExecutionGrantToken(
      token,
      'CAP_ALIAS_MANAGE',
      params
    );
    expect(validResult.isValid).toBe(true);

    // Replay check
    const replayResult = TokenVerifier.verifyExecutionGrantToken(
      token,
      'CAP_ALIAS_MANAGE',
      params
    );
    expect(replayResult.isValid).toBe(false);
    expect(replayResult.errorCode).toBe('TOKEN_CONSUMED');
  });
});
