import { PermissionManager } from '../src/permissions/PermissionManager';
import { MockPermissionProvider } from '../src/permissions/mockPermissionProvider';
import { evaluatePermissionTiers, EvaluationContext } from '../src/permissions/tierEvaluation';
import { buildPermissionRationaleArabic } from '../src/permissions/rationaleBuilder';
import { PERMISSION_DEFINITIONS } from '../src/permissions/permissionRegistry';
import { CapabilityId, PermissionId } from '../src/permissions/types';

describe('Permission Abstraction & 4-Tier Authorization', () => {
  let manager: PermissionManager;
  let provider: MockPermissionProvider;

  beforeEach(() => {
    provider = new MockPermissionProvider();
    manager = new PermissionManager(provider);
  });

  describe('Tier 1: Feature Gate Enforcement', () => {
    it('strictly denies gated capabilities by default', () => {
      const gatedCapabilities = [
        'CAP_CONTACT_CALL',
        'CAP_MESSAGE_SEND',
        'CAP_LOCATION_READ',
        'CAP_LOCATION_SHARE',
        'CAP_CALENDAR_READ',
        'CAP_CALENDAR_WRITE',
        'CAP_EMERGENCY_TRIGGER',
      ] as const;

      for (const cap of gatedCapabilities) {
        const result = manager.evaluateCapability(cap);
        expect(result.status).toBe('DENIED');
        expect(result.reasonCode).toBe('POLICY_ERR_CAPABILITY_DISABLED');
        expect(result.arabicMessage).toBeDefined();
      }
    });

    it('allows active baseline capabilities to proceed through tier evaluation', () => {
      const activeCapabilities = [
        'CAP_ASSISTANT_QUERY',
        'CAP_ALIAS_MANAGE',
        'CAP_SETTINGS_ACCESSIBILITY',
        'CAP_AUDIT_INSPECT',
        'CAP_ACTION_CANCEL',
      ] as const;

      for (const cap of activeCapabilities) {
        const result = manager.evaluateCapability(cap);
        expect(result.status).not.toBe('DENIED');
      }
    });
  });

  describe('Tier 2: User Consent Enforcement', () => {
    it('denies execution when user consent is missing', () => {
      const context: EvaluationContext = {
        capabilityId: 'CAP_ALIAS_MANAGE',
        userGrants: new Set(), // no consent
        osPermissions: {},
        featureGates: {
          CAP_ALIAS_MANAGE: true,
        } as unknown as Record<CapabilityId, boolean>,
      };

      const result = evaluatePermissionTiers(context);
      expect(result.status).toBe('DENIED');
      expect(result.reasonCode).toBe('POLICY_ERR_USER_CONSENT_MISSING');
    });
  });

  describe('Tier 3: Android OS Runtime Permission Enforcement', () => {
    it('denies execution when OS permission is not granted', () => {
      const context: EvaluationContext = {
        capabilityId: 'CAP_CONTACT_CALL',
        userGrants: new Set(['sanad:perm:contacts:read', 'sanad:perm:telephony:call']),
        osPermissions: { 'android.permission.CALL_PHONE': false },
        featureGates: {
          CAP_CONTACT_CALL: true, // artificially enable gate to test Tier 3
        } as unknown as Record<CapabilityId, boolean>,
      };

      const result = evaluatePermissionTiers(context);
      expect(result.status).toBe('DENIED');
      expect(result.reasonCode).toBe('POLICY_ERR_OS_PERMISSION_DENIED');
    });
  });

  describe('Tier 4: Action Challenge & Confirmation Determination', () => {
    it('requires confirmation for high risk actions and generates ephemeral token', () => {
      const context: EvaluationContext = {
        capabilityId: 'CAP_CONTACT_CALL',
        userGrants: new Set(['sanad:perm:contacts:read', 'sanad:perm:telephony:call']),
        osPermissions: {
          'android.permission.CALL_PHONE': true,
          'android.permission.READ_CONTACTS': true,
        },
        featureGates: {
          CAP_CONTACT_CALL: true, // simulate enabled gate
        } as unknown as Record<CapabilityId, boolean>,
      };

      const result = evaluatePermissionTiers(context);
      expect(result.status).toBe('CONFIRMATION_REQUIRED');
      expect(result.riskTier).toBe('HIGH');
      expect(result.confirmationToken).toMatch(/^ct_/);
      expect(result.expiresAt).toBeDefined();
    });

    it('requires confirmation on conditional alias overwrite', () => {
      const result = manager.evaluateCapability('CAP_ALIAS_MANAGE', true);
      expect(result.status).toBe('CONFIRMATION_REQUIRED');
      expect(result.confirmationToken).toMatch(/^ct_/);
    });

    it('allows direct execution for low-risk read actions without confirmation', () => {
      const result = manager.evaluateCapability('CAP_ASSISTANT_QUERY');
      expect(result.status).toBe('ALLOWED');
      expect(result.executionGrantToken).toMatch(/^gt_/);
    });
  });

  describe('Permission Rationale Builder', () => {
    it('builds clear Arabic spoken prompts for each permission', () => {
      Object.keys(PERMISSION_DEFINITIONS).forEach((permKey) => {
        const rationale = buildPermissionRationaleArabic(permKey as PermissionId);
        expect(rationale.title).toContain('إذن');
        expect(rationale.spokenPrompt).toContain('سند');
        expect(rationale.rationale.length).toBeGreaterThan(5);
      });
    });
  });
});
