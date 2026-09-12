/**
 * Sanad Security Test Suite: Cross-Platform Canonicalization & SHA-256 Parity Audit
 * 
 * Audits ADR-004 compliance:
 * - Verifies identical SHA-256 actionHash computation across Node.js (backend) and React Native / Hermes (mobile).
 * - Tests UTF-8 Arabic text canonicalization, nested structures, array ordering, and key permutation invariance.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  canonicalizeJson as backendCanonicalize,
  computeActionHash as backendComputeActionHash,
} from '../../backend/packages/common/src/tokens.js';
import {
  canonicalizeJson as mobileCanonicalize,
  computeActionHash as mobileComputeActionHash,
  sha256PureJs,
} from '../../mobile/src/security/canonicalize.js';

describe('Security Audit: Cross-Platform JSON Canonicalization & ActionHash Parity', () => {
  it('should produce identical canonical JSON for arbitrary key orderings across backend and mobile', () => {
    const perm1 = {
      aliasName: 'دكتور العيون',
      contactId: 'cnt_550e8400-e29b-41d4-a716-446655440000',
      metadata: {
        priority: 1,
        tags: ['medical', 'emergency'],
        verified: true,
      },
    };

    const perm2 = {
      metadata: {
        verified: true,
        tags: ['medical', 'emergency'],
        priority: 1,
      },
      contactId: 'cnt_550e8400-e29b-41d4-a716-446655440000',
      aliasName: 'دكتور العيون',
    };

    const backendJson1 = backendCanonicalize(perm1);
    const backendJson2 = backendCanonicalize(perm2);
    const mobileJson1 = mobileCanonicalize(perm1);
    const mobileJson2 = mobileCanonicalize(perm2);

    assert.equal(backendJson1, backendJson2, 'Backend canonicalization must be key-order invariant');
    assert.equal(mobileJson1, mobileJson2, 'Mobile canonicalization must be key-order invariant');
    assert.equal(backendJson1, mobileJson1, 'Backend and Mobile canonical JSON strings must be strictly identical');
  });

  it('should compute identical SHA-256 actionHash between backend and mobile for Arabic dialect payloads', () => {
    const testCases: Array<{ capability: string; params: Record<string, unknown> }> = [
      {
        capability: 'CAP_ALIAS_MANAGE',
        params: { aliasName: 'مرتي', contactId: 'cnt_123' },
      },
      {
        capability: 'CAP_ALIAS_MANAGE',
        params: { aliasName: 'دكتور العيون', contactId: 'cnt_888' },
      },
      {
        capability: 'CAP_CONTACT_CALL',
        params: { targetAlias: 'أبوي', contactId: 'cnt_456' },
      },
      {
        capability: 'CAP_MESSAGE_SEND',
        params: {
          recipientId: 'cnt_789',
          body: 'مرحبا، أنا في الطريق إلى رام الله الآن',
        },
      },
      {
        capability: 'CAP_LOCATION_SHARE',
        params: {
          recipientId: 'cnt_999',
          landmarkArabic: 'قرب دوار المنارة، رام الله',
          coordinatesCoarse: 'WB-RAM-01',
        },
      },
      {
        capability: 'CAP_CALENDAR_WRITE',
        params: {
          title: 'موعد فحص النظر في مستشفى سان جون بالقدس',
          startTime: '2026-09-15T09:00:00Z',
          endTime: '2026-09-15T10:30:00Z',
        },
      },
      {
        capability: 'CAP_ASSISTANT_QUERY',
        params: {},
      },
    ];

    for (const { capability, params } of testCases) {
      const backendHash = backendComputeActionHash(capability, params);
      const mobileHash = mobileComputeActionHash(capability, params);

      assert.equal(
        mobileHash,
        backendHash,
        `ActionHash mismatch for capability ${capability} with payload: ${JSON.stringify(params)}`
      );

      // Verify length and hex format
      assert.equal(backendHash.length, 64);
      assert.match(backendHash, /^[0-9a-f]{64}$/);
    }
  });

  it('should verify that pure JS SHA-256 implementation matches Node.js crypto across Arabic strings and RFC test vectors', () => {
    const testStrings = [
      '',
      'abc',
      'message digest',
      'abcdefghijklmnopqrstuvwxyz',
      'طوارئ',
      'مرتي',
      'دكتور العيون',
      'مرحبا بك في تطبيق سند للمكفوفين في فلسطين',
      'CAP_ALIAS_MANAGE:{"aliasName":"مرتي","contactId":"cnt_550e8400"}',
    ];

    for (const str of testStrings) {
      const nodeHash = crypto.createHash('sha256').update(str, 'utf8').digest('hex');
      const pureJsHash = sha256PureJs(str);

      assert.equal(
        pureJsHash,
        nodeHash,
        `sha256PureJs mismatch on string: "${str}"`
      );
    }
  });

  it('should handle undefined / null parameter defaulting identically across backend and mobile', () => {
    const backendEmptyHash = backendComputeActionHash('CAP_ASSISTANT_QUERY', undefined);
    const mobileEmptyHash = mobileComputeActionHash('CAP_ASSISTANT_QUERY', undefined);

    assert.equal(
      mobileEmptyHash,
      backendEmptyHash,
      'Undefined parameters must default to {} and produce identical hashes on backend and mobile'
    );
  });
});
