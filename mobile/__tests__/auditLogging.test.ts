import { DataSanitizer } from '../src/security/sanitizer';
import { auditLogger } from '../src/security/auditLogger';

describe('Security & Zero-PII Audit Logging', () => {
  beforeEach(() => {
    auditLogger.clearLogs();
  });

  describe('DataSanitizer', () => {
    it('masks phone numbers safely: +972 59 *** **56', () => {
      const rawPhone = '+972 59 912 3456';
      const masked = DataSanitizer.maskPhoneNumber(rawPhone);
      expect(masked).toBe('+97259 *** **56');
      expect(masked).not.toContain('912');
    });

    it('hashes contact identifiers', () => {
      const hashed1 = DataSanitizer.hashIdentifier('مرتي');
      const hashed2 = DataSanitizer.hashIdentifier('أخوي');
      expect(hashed1).toMatch(/^hash_id_/);
      expect(hashed1).not.toBe(hashed2);
    });

    it('strips digits from utterance transcripts', () => {
      const withDigits = 'اتصل على 0599123456 هسا';
      const sanitized = DataSanitizer.stripDigitsFromUtterance(withDigits);
      expect(sanitized).toBe('اتصل على ********** هسا');
    });

    it('throws error when forbidden PII keys are passed to assertZeroPII', () => {
      expect(() => {
        DataSanitizer.assertZeroPII({ phoneNumber: '+972599123456' });
      }).toThrow(/Security Violation/);

      expect(() => {
        DataSanitizer.assertZeroPII({ gpsCoordinates: { lat: 31.9, lng: 35.2 } });
      }).toThrow(/Security Violation/);

      expect(() => {
        DataSanitizer.assertZeroPII({ smsContent: 'Private message' });
      }).toThrow(/Security Violation/);

      expect(() => {
        DataSanitizer.assertZeroPII({ authToken: 'secret_bearer_token' });
      }).toThrow(/Security Violation/);
    });

    it('allows safe non-PII metadata through assertZeroPII', () => {
      expect(() => {
        DataSanitizer.assertZeroPII({
          toolName: 'TOOL_ALIAS_REGISTER',
          durationMs: 45,
          success: true,
        });
      }).not.toThrow();
    });
  });

  describe('AuditLogger', () => {
    it('records structured audit event and maintains bounded history', () => {
      auditLogger.logEvent({
        userId: 'user_pseudonym_123',
        requestedCapability: 'CAP_ALIAS_MANAGE',
        policyDecision: 'ALLOWED',
        reasonCode: 'POL_ALLOW_DIRECT_EXECUTION',
        executionStatus: 'SUCCESS',
        safeMetadata: { toolName: 'TOOL_ALIAS_REGISTER' },
      });

      const logs = auditLogger.getRecentLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].requestedCapability).toBe('CAP_ALIAS_MANAGE');
      expect(logs[0].eventId).toMatch(/^evt_/);
      expect(logs[0].timestamp).toBeDefined();
    });
  });
});
