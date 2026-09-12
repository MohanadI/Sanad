import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hashAliasName,
  sanitizeUtteranceForAudit,
  sanitizeMetadataForAudit,
} from '../src/redactor.js';
import { isSecureAuditEntry, AuditEventSchema } from '../src/types.js';

describe('Audit Redactor (Zero-PII & Zero-Phone Invariant Enforcement)', () => {
  describe('Zero-Phone Storage Invariant (ADR-006)', () => {
    it('should completely strip phone number and MSISDN keys from metadata', () => {
      const metadata = {
        city: 'Ramallah',
        phoneNumber: '+972599123456',
        msisdn: '0599123456',
        mobile: '0568112233',
        alias: 'مرتي',
      };

      const sanitized = sanitizeMetadataForAudit(metadata);

      assert.equal((sanitized as Record<string, unknown>).phoneNumber, undefined);
      assert.equal((sanitized as Record<string, unknown>).msisdn, undefined);
      assert.equal((sanitized as Record<string, unknown>).mobile, undefined);
      assert.equal(sanitized.city, 'Ramallah');
      assert.match(sanitized.alias as string, /^hash_alias_/);
    });

    it('should sanitize string fields containing Palestinian phone numbers', () => {
      const metadata = {
        note: 'اتصل على 0599123456 فورا',
      };

      const sanitized = sanitizeMetadataForAudit(metadata);
      assert.equal(sanitized.note, '[REDACTED_PHONE]');
    });

    it('should enforce that audit schemas reject any forbidden phone keys or hashes', () => {
      const invalidEntry = {
        phoneHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      };
      assert.equal(isSecureAuditEntry(invalidEntry), false);

      const validEntry = {
        deviceContactRef: 'cnt_550e8400-e29b-41d4-a716-446655440000',
        status: 'SUCCESS',
      };
      assert.equal(isSecureAuditEntry(validEntry), true);
    });
  });

  describe('hashAliasName', () => {
    it('should generate deterministic hash for aliases without storing plaintext name', () => {
      const hash1 = hashAliasName('مرتي');
      const hash2 = hashAliasName('مرتي');
      const hash3 = hashAliasName('أخوي');

      assert.ok(hash1.startsWith('hash_alias_'));
      assert.equal(hash1, hash2);
      assert.notEqual(hash1, hash3);
    });
  });

  describe('sanitizeUtteranceForAudit', () => {
    it('should strip Western and Arabic digits from speech transcriptions', () => {
      const input = 'رقم الهوية هو 987654321 ورقم تلفوني ٠٥٩٩١٢٣٤٥٦';
      const sanitized = sanitizeUtteranceForAudit(input);

      assert.ok(!sanitized.includes('987654321'));
      assert.ok(!sanitized.includes('٠٥٩٩١٢٣٤٥٦'));
      assert.match(sanitized, /\[REDACTED_NUMBER\]/);
    });
  });

  describe('sanitizeMetadataForAudit', () => {
    it('should remove precise GPS coordinates per Palestinian data classification policy', () => {
      const metadata = {
        latitude: 31.9038,
        longitude: 35.2034,
        city: 'Ramallah',
        alias: 'مرتي',
      };

      const sanitized = sanitizeMetadataForAudit(metadata);

      assert.equal(sanitized.latitude, '[GPS_OMITTED_PER_POLICY]');
      assert.equal(sanitized.longitude, '[GPS_OMITTED_PER_POLICY]');
      assert.equal(sanitized.city, 'Ramallah');
      assert.match(sanitized.alias as string, /^hash_alias_/);
    });

    it('should handle nested structures recursively', () => {
      const nested = {
        device: {
          coords: {
            lat: 31.5,
            lon: 34.4,
          },
        },
      };

      const sanitized = sanitizeMetadataForAudit(nested);
      const inner = (sanitized.device as Record<string, unknown>).coords as Record<string, unknown>;
      assert.equal(inner.lat, '[GPS_OMITTED_PER_POLICY]');
      assert.equal(inner.lon, '[GPS_OMITTED_PER_POLICY]');
    });
  });
});
