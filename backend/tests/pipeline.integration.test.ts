import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  CAPABILITIES,
  PERMISSIONS,
  type StructuredAction,
  StructuredActionSchema,
} from '@sanad/common';
import { DeterministicIntentClassifier } from '@sanad/intent-classifier';
import { DeterministicPolicyEngineClient } from '@sanad/policy-engine';
import {
  DefaultToolRegistry,
  AssistantQueryTool,
  ActionCancelTool,
  AliasListTool,
} from '@sanad/tool-executors';
import { InMemoryAuditLogger, type AuditEvent } from '@sanad/audit-log';

describe('Backend Self-Contained Pipeline Integration Test', () => {
  const classifier = new DeterministicIntentClassifier();
  const policyEngine = new DeterministicPolicyEngineClient({
    secretKey: 'backend-isolated-secret-test-key-32b',
    confirmationTtlSeconds: 30,
    grantTtlSeconds: 10,
  });
  const toolRegistry = new DefaultToolRegistry();
  toolRegistry.register(new AssistantQueryTool());
  toolRegistry.register(new ActionCancelTool());
  toolRegistry.register(new AliasListTool());
  const auditLogger = new InMemoryAuditLogger();

  const testUserId = 'usr_pilot_blind_user_01';
  const testDeviceId = 'dev_android_redmi_note';

  it('Slice 1 (Happy Path): Voice Query -> Classifier -> Policy -> Tool -> Audit', async () => {
    const candidate = await classifier.classify({
      sessionId: 'sess_backend_1',
      text: 'كم الساعة',
      dialectLocale: 'ar-PS-WestBank',
      clientTimestamp: new Date().toISOString(),
      inputModality: 'VOICE_STT',
    });

    assert.equal(candidate.intentId, 'INTENT_ASSISTANT_QUERY');

    const action: StructuredAction = StructuredActionSchema.parse({
      ...candidate,
      actionId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });

    const policyDecision = await policyEngine.evaluate({
      userId: testUserId,
      deviceId: testDeviceId,
      action,
      userGrants: [PERMISSIONS.SYSTEM_QUERY],
      osPermissions: {},
    });

    assert.equal(policyDecision.status, 'ALLOWED');
    if (policyDecision.status !== 'ALLOWED') return;

    const grantPayload = await policyEngine.verifyExecutionGrant(
      policyDecision.executionGrantToken,
      'TOOL_ASSISTANT_QUERY'
    );

    const toolResult = await toolRegistry.execute(
      grantPayload.toolName,
      action.slots,
      {
        token: policyDecision.executionGrantToken,
        actionId: grantPayload.actionId,
        targetCapability: grantPayload.targetCapability,
        actionHash: grantPayload.actionHash,
        expiresAt: grantPayload.expiresAt,
        issuedAt: grantPayload.issuedAt,
        nonce: grantPayload.nonce,
      }
    );

    assert.equal(toolResult.success, true);
    assert.ok(toolResult.feedbackArabic);

    const auditEvent: AuditEvent = {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId: testUserId,
      sessionId: 'sess_backend_1',
      requestedCapability: action.targetCapability,
      intentId: action.intentId,
      policyDecision: 'ALLOWED',
      reasonCode: 'POL_ALLOW_READONLY',
      executionStatus: 'SUCCESS',
      riskTier: 'LOW',
      sanitizedMetadata: {
        queryType: action.slots.queryType,
      },
    };

    await auditLogger.log(auditEvent);
    assert.equal(await auditLogger.count(), 1);
  });

  it('Slice 2 (Security Gate): Gated Calling Intent -> Blocked deterministically', async () => {
    const candidate = await classifier.classify({
      sessionId: 'sess_backend_2',
      text: 'رن على مرتي',
      dialectLocale: 'ar-PS-Gaza',
      clientTimestamp: new Date().toISOString(),
      inputModality: 'VOICE_STT',
    });

    assert.equal(candidate.intentId, 'INTENT_CONTACT_CALL');
    assert.equal(candidate.targetCapability, 'CAP_CONTACT_CALL');

    const action: StructuredAction = StructuredActionSchema.parse({
      ...candidate,
      actionId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });

    const policyDecision = await policyEngine.evaluate({
      userId: testUserId,
      deviceId: testDeviceId,
      action,
      userGrants: [PERMISSIONS.CONTACTS_READ, PERMISSIONS.TELEPHONY_CALL],
      osPermissions: { 'android.permission.CALL_PHONE': true },
    });

    assert.equal(policyDecision.status, 'DENIED');
    if (policyDecision.status === 'DENIED') {
      assert.equal(policyDecision.reasonCode, 'POLICY_ERR_CAPABILITY_DISABLED');
    }
  });
});
