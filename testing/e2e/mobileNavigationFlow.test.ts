import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { PermissionManager } from '../../mobile/src/permissions/PermissionManager.js';
import { BoundedToolExecutor } from '../../mobile/src/capabilities/toolExecutor.js';
import { TokenVerifier } from '../../mobile/src/security/tokenVerifier.js';
import { aliasStore } from '../../mobile/src/storage/AliasStore.js';

describe('Mobile End-to-End Foundation Interaction Flow', () => {
  beforeEach(() => {
    TokenVerifier.resetConsumedNonces();
  });

  it('completes the low-risk assistant query pipeline end-to-end', async () => {
    const permManager = new PermissionManager();

    // 1. Evaluate policy for CAP_ASSISTANT_QUERY
    const evalResult = permManager.evaluateCapability('CAP_ASSISTANT_QUERY');
    assert.strictEqual(evalResult.status, 'ALLOWED');
    assert.ok(evalResult.executionGrantToken, 'Execution grant token must exist');

    // 2. Execute bounded tool with the single-use token
    const toolResult = await BoundedToolExecutor.executeTool({
      toolName: 'TOOL_ASSISTANT_QUERY',
      targetCapability: 'CAP_ASSISTANT_QUERY',
      executionGrantToken: evalResult.executionGrantToken!,
      parameters: {},
    });

    assert.strictEqual(toolResult.success, true);
    assert.strictEqual(toolResult.audioCue, 'EARCON_SUCCESS');
  });

  it('completes the contact alias registration and lookup lifecycle', async () => {
    const permManager = new PermissionManager();

    // 1. Evaluate policy for new alias
    const evalResult = permManager.evaluateCapability('CAP_ALIAS_MANAGE', false);
    assert.strictEqual(evalResult.status, 'ALLOWED');

    // 2. Execute tool
    const toolResult = await BoundedToolExecutor.executeTool({
      toolName: 'TOOL_ALIAS_REGISTER',
      targetCapability: 'CAP_ALIAS_MANAGE',
      executionGrantToken: evalResult.executionGrantToken!,
      parameters: {
        aliasName: 'دكتور العيون',
        contactId: 'cnt_004_doctor',
        contactName: 'د. طارق عيون',
      },
    });

    assert.strictEqual(toolResult.success, true);

    // 3. Verify alias was persisted in secure alias store
    const resolved = await aliasStore.findByAlias('دكتور العيون');
    assert.ok(resolved !== null, 'Resolved alias must not be null');
    assert.strictEqual(resolved?.contactName, 'د. طارق عيون');
  });

  it('blocks attempt to execute gated telephony capability without token or authorization', async () => {
    const permManager = new PermissionManager();

    // 1. Policy evaluation MUST reject
    const evalResult = permManager.evaluateCapability('CAP_CONTACT_CALL');
    assert.strictEqual(evalResult.status, 'DENIED');
    assert.strictEqual(evalResult.reasonCode, 'POLICY_ERR_CAPABILITY_DISABLED');

    // 2. Attempting to execute with fake token MUST fail
    await assert.rejects(async () => {
      await BoundedToolExecutor.executeTool({
        toolName: 'TOOL_CALL_PHONE',
        targetCapability: 'CAP_CONTACT_CALL',
        executionGrantToken: 'gt_fake_token',
        parameters: { contactId: 'cnt_123' },
      });
    });
  });
});
