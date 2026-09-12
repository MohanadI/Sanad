import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryAuditLogger } from '../src/logger.js';
import type { AuditEvent } from '../src/types.js';

describe('InMemoryAuditLogger (Append-Only & Querying)', () => {
  const makeEvent = (overrides: Partial<AuditEvent> = {}): AuditEvent => ({
    eventId: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: new Date().toISOString(),
    userId: 'usr_test_1',
    sessionId: 'sess_123',
    requestedCapability: 'CAP_ASSISTANT_QUERY',
    intentId: 'INTENT_ASSISTANT_QUERY',
    policyDecision: 'ALLOWED',
    reasonCode: 'POL_ALLOW_READONLY',
    executionStatus: 'SUCCESS',
    riskTier: 'LOW',
    sanitizedMetadata: {
      phoneNumber: '+972599123456',
      latitude: 31.9,
    },
    ...overrides,
  });

  it('should log audit event and automatically sanitize PII metadata on ingestion', async () => {
    const logger = new InMemoryAuditLogger();
    await logger.log(makeEvent());

    assert.equal(await logger.count(), 1);
    const events = await logger.query();
    assert.equal(events.length, 1);

    const logged = events[0]!;
    assert.equal(logged.sanitizedMetadata.latitude, '[GPS_OMITTED_PER_POLICY]');
    // Zero-Phone Invariant (ADR-006): phone keys are completely purged
    assert.equal(logged.sanitizedMetadata.phoneNumber, undefined);
  });

  it('should support querying by user, capability, and policy decision', async () => {
    const logger = new InMemoryAuditLogger();
    await logger.log(makeEvent({ userId: 'usr_1', policyDecision: 'ALLOWED' }));
    await logger.log(makeEvent({ userId: 'usr_2', policyDecision: 'DENIED', reasonCode: 'POLICY_ERR_CAPABILITY_DISABLED' }));

    const user1Events = await logger.query({ userId: 'usr_1' });
    assert.equal(user1Events.length, 1);
    assert.equal(user1Events[0]?.userId, 'usr_1');

    const deniedEvents = await logger.query({ decision: 'DENIED' });
    assert.equal(deniedEvents.length, 1);
    assert.equal(deniedEvents[0]?.reasonCode, 'POLICY_ERR_CAPABILITY_DISABLED');
  });

  it('should reject malformed audit events failing Zod schema', async () => {
    const logger = new InMemoryAuditLogger();
    const invalid = {
      eventId: 'not-a-uuid',
    } as unknown as AuditEvent;

    await assert.rejects(() => logger.log(invalid));
  });
});
