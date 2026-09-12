import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AssistantQueryTool,
  ActionCancelTool,
  AliasListTool,
  DefaultToolRegistry,
} from '../src/index.js';
import {
  CAPABILITIES,
  CapabilityDisabledError,
  TamperedParametersError,
  computeActionHash,
  type ExecutionAuthToken,
} from '@sanad/common';

describe('Tool Executors & Registry', () => {
  const validGrant = (
    cap: typeof CAPABILITIES[keyof typeof CAPABILITIES],
    toolName = 'TOOL_ASSISTANT_QUERY',
    params: unknown = {}
  ): ExecutionAuthToken => ({
    token: 'gt_valid_test_token',
    actionId: '550e8400-e29b-41d4-a716-446655440000',
    targetCapability: cap,
    toolName,
    actionHash: computeActionHash(toolName, params),
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    nonce: '550e8400-e29b-41d4-a716-446655440001',
  });

  const expiredGrant = (
    cap: typeof CAPABILITIES[keyof typeof CAPABILITIES],
    toolName = 'TOOL_ASSISTANT_QUERY',
    params: unknown = {}
  ): ExecutionAuthToken => ({
    ...validGrant(cap, toolName, params),
    expiresAt: new Date(Date.now() - 1000).toISOString(),
  });

  describe('AssistantQueryTool', () => {
    const tool = new AssistantQueryTool();

    it('should execute TIME_DATE query successfully with valid token', async () => {
      const input = { queryType: 'TIME_DATE' as const };
      const grant = validGrant(CAPABILITIES.CAP_ASSISTANT_QUERY, tool.toolName, input);
      const result = await tool.execute(input, grant);

      assert.equal(result.success, true);
      assert.ok(result.feedbackArabic);
      assert.equal(result.data?.queryType, 'TIME_DATE');
    });

    it('should execute BATTERY_STATUS query successfully', async () => {
      const input = { queryType: 'BATTERY_STATUS' as const };
      const grant = validGrant(CAPABILITIES.CAP_ASSISTANT_QUERY, tool.toolName, input);
      const result = await tool.execute(input, grant);

      assert.equal(result.success, true);
      assert.match(result.feedbackArabic, /البطارية/);
    });

    it('should execute HELP query successfully', async () => {
      const input = { queryType: 'HELP' as const };
      const grant = validGrant(CAPABILITIES.CAP_ASSISTANT_QUERY, tool.toolName, input);
      const result = await tool.execute(input, grant);

      assert.equal(result.success, true);
      assert.match(result.feedbackArabic, /سند/);
    });

    it('should reject execution with expired grant token', async () => {
      const input = { queryType: 'HELP' as const };
      const grant = expiredGrant(CAPABILITIES.CAP_ASSISTANT_QUERY, tool.toolName, input);
      await assert.rejects(
        () => tool.execute(input, grant),
        /expired/i
      );
    });

    it('should reject execution with capability mismatch in grant token', async () => {
      const input = { queryType: 'HELP' as const };
      const grant = validGrant(CAPABILITIES.CAP_ALIAS_MANAGE, tool.toolName, input); // Wrong capability
      await assert.rejects(
        () => tool.execute(input, grant),
        /mismatch/i
      );
    });

    it('should reject execution with TamperedParametersError when parameters do not match actionHash (ADR-004)', async () => {
      const legitimateInput = { queryType: 'TIME_DATE' as const };
      const tamperedInput = { queryType: 'HELP' as const };
      const grant = validGrant(CAPABILITIES.CAP_ASSISTANT_QUERY, tool.toolName, legitimateInput);

      await assert.rejects(
        () => tool.execute(tamperedInput, grant),
        TamperedParametersError
      );
    });
  });

  describe('ActionCancelTool', () => {
    const tool = new ActionCancelTool();

    it('should immediately preempt and cancel active action', async () => {
      const input = { reason: 'USER_ABORT' };
      const grant = validGrant(CAPABILITIES.CAP_ACTION_CANCEL, tool.toolName, input);
      const result = await tool.execute(input, grant);

      assert.equal(result.success, true);
      assert.equal(result.data?.cancelled, true);
      assert.equal(result.audioCue, 'EARCON_ACTION_CANCELLED');
    });

    it('should reject tampered parameters with TamperedParametersError', async () => {
      const input = { reason: 'USER_ABORT' };
      const grant = validGrant(CAPABILITIES.CAP_ACTION_CANCEL, tool.toolName, { reason: 'DIFFERENT' });

      await assert.rejects(
        () => tool.execute(input, grant),
        TamperedParametersError
      );
    });
  });

  describe('AliasListTool', () => {
    const tool = new AliasListTool([
      { id: '1', alias: 'مرتي', contactName: 'هدى' },
      { id: '2', alias: 'أخوي', contactName: 'أحمد' },
    ]);

    it('should return all configured aliases', async () => {
      const input = {};
      const grant = validGrant(CAPABILITIES.CAP_ALIAS_MANAGE, tool.toolName, input);
      const result = await tool.execute(input, grant);

      assert.equal(result.success, true);
      assert.equal(result.data?.count, 2);
      assert.equal(result.data?.aliases[0]?.alias, 'مرتي');
    });

    it('should filter aliases if filter parameter is provided', async () => {
      const input = { filter: 'مرتي' };
      const grant = validGrant(CAPABILITIES.CAP_ALIAS_MANAGE, tool.toolName, input);
      const result = await tool.execute(input, grant);

      assert.equal(result.success, true);
      assert.equal(result.data?.count, 1);
    });

    it('should reject tampered filter parameter with TamperedParametersError (ADR-004)', async () => {
      const legitimateInput = { filter: 'مرتي' };
      const tamperedInput = { filter: 'أخوي' };
      const grant = validGrant(CAPABILITIES.CAP_ALIAS_MANAGE, tool.toolName, legitimateInput);

      await assert.rejects(
        () => tool.execute(tamperedInput, grant),
        TamperedParametersError
      );
    });
  });

  describe('ToolRegistry', () => {
    it('should register and execute tools via registry dispatch', async () => {
      const registry = new DefaultToolRegistry();
      const queryTool = new AssistantQueryTool();
      registry.register(queryTool);

      assert.equal(registry.has('TOOL_ASSISTANT_QUERY'), true);

      const input = { queryType: 'HELP' as const };
      const grant = validGrant(CAPABILITIES.CAP_ASSISTANT_QUERY, 'TOOL_ASSISTANT_QUERY', input);
      const result = await registry.execute('TOOL_ASSISTANT_QUERY', input, grant);
      assert.equal(result.success, true);
    });

    it('should detect parameter substitution and throw TamperedParametersError in registry dispatch (ADR-004)', async () => {
      const registry = new DefaultToolRegistry();
      const queryTool = new AssistantQueryTool();
      registry.register(queryTool);

      const legitimateInput = { queryType: 'HELP' as const };
      const tamperedInput = { queryType: 'BATTERY_STATUS' as const };
      const grant = validGrant(CAPABILITIES.CAP_ASSISTANT_QUERY, 'TOOL_ASSISTANT_QUERY', legitimateInput);

      await assert.rejects(
        () => registry.execute('TOOL_ASSISTANT_QUERY', tamperedInput, grant),
        TamperedParametersError
      );
    });

    it('should reject duplicate tool registrations', () => {
      const registry = new DefaultToolRegistry();
      const queryTool = new AssistantQueryTool();
      registry.register(queryTool);
      assert.throws(() => registry.register(queryTool), /already registered/i);
    });

    it('should reject unknown tool names', async () => {
      const registry = new DefaultToolRegistry();
      const grant = validGrant(CAPABILITIES.CAP_ASSISTANT_QUERY);
      await assert.rejects(
        () => registry.execute('TOOL_NON_EXISTENT', {}, grant),
        /unknown tool/i
      );
    });

    it('should enforce capability gating in registry and block disabled capabilities', async () => {
      const registry = new DefaultToolRegistry();

      // Mock a tool attempting to bind to a gated capability
      const fakeGatedTool = {
        toolName: 'TOOL_CONTACT_CALL',
        requiredCapability: CAPABILITIES.CAP_CONTACT_CALL,
        requiredPermission: 'sanad:perm:telephony:call',
        isSensitive: true,
        execute: async () => ({ success: true, feedbackArabic: '' }),
      };

      registry.register(fakeGatedTool);
      const grant = validGrant(CAPABILITIES.CAP_CONTACT_CALL, 'TOOL_CONTACT_CALL', {});

      await assert.rejects(
        () => registry.execute('TOOL_CONTACT_CALL', {}, grant),
        CapabilityDisabledError
      );
    });
  });
});
