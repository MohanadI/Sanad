import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  StructuredActionCandidateSchema,
  StructuredActionSchema,
  AssistantQuerySlotsSchema,
  AliasSetSlotsSchema,
  validateIntentSlots,
  AssistantInterpretRequestSchema,
  PolicyEvaluateRequestSchema,
  PolicyConfirmRequestSchema,
  ToolExecuteRequestSchema,
  SanadApiErrorSchema,
  MESSAGE_KEYS,
  t,
  defaultCatalogResolver,
  CAPABILITIES,
  CAPABILITY_CONFIG,
} from '../src/index.js';

describe('Common Schemas & Contracts', () => {
  describe('StructuredActionCandidateSchema', () => {
    it('should validate a valid action candidate', () => {
      const validCandidate = {
        intentId: 'INTENT_ASSISTANT_QUERY',
        targetCapability: 'CAP_ASSISTANT_QUERY',
        confidence: 0.95,
        slots: { queryType: 'TIME_DATE' },
        requiresConfirmation: false,
        rawUtteranceSanitized: 'كم الساعه',
      };

      const result = StructuredActionCandidateSchema.parse(validCandidate);
      assert.equal(result.intentId, 'INTENT_ASSISTANT_QUERY');
      assert.equal(result.confidence, 0.95);
    });

    it('should reject candidates with unknown injected properties (.strict())', () => {
      const injectedCandidate = {
        intentId: 'INTENT_ASSISTANT_QUERY',
        targetCapability: 'CAP_ASSISTANT_QUERY',
        confidence: 0.95,
        slots: { queryType: 'TIME_DATE' },
        requiresConfirmation: false,
        rawUtteranceSanitized: 'كم الساعه',
        __injectedAdminCommand: 'GRANT_ALL_PERMISSIONS', // Injected field
      };

      assert.throws(() => {
        StructuredActionCandidateSchema.parse(injectedCandidate);
      }, /unrecognized_keys/i);
    });

    it('should reject candidates with confidence outside [0, 1]', () => {
      const invalidConfidence = {
        intentId: 'INTENT_ASSISTANT_QUERY',
        targetCapability: 'CAP_ASSISTANT_QUERY',
        confidence: 1.5,
        slots: {},
        requiresConfirmation: false,
        rawUtteranceSanitized: 'test',
      };

      assert.throws(() => {
        StructuredActionCandidateSchema.parse(invalidConfidence);
      });
    });
  });

  describe('Slot Schemas validation', () => {
    it('should validate AssistantQuerySlotsSchema strictly', () => {
      const valid = { queryType: 'BATTERY_STATUS' };
      assert.doesNotThrow(() => AssistantQuerySlotsSchema.parse(valid));

      const extraField = { queryType: 'HELP', extraProp: 'malicious' };
      assert.throws(() => AssistantQuerySlotsSchema.parse(extraField));

      const invalidEnum = { queryType: 'UNKNOWN_TYPE' };
      assert.throws(() => AssistantQuerySlotsSchema.parse(invalidEnum));
    });

    it('should validate AliasSetSlotsSchema strictly', () => {
      const valid = { aliasName: 'مرتي', targetContact: 'هدى' };
      assert.doesNotThrow(() => AliasSetSlotsSchema.parse(valid));

      const emptyName = { aliasName: '', targetContact: 'هدى' };
      assert.throws(() => AliasSetSlotsSchema.parse(emptyName));
    });

    it('should validate slots via validateIntentSlots', () => {
      const validated = validateIntentSlots('INTENT_ASSISTANT_QUERY', { queryType: 'HELP' });
      assert.equal(validated.queryType, 'HELP');
    });
  });

  describe('StructuredActionSchema', () => {
    it('should validate full structured action with uuid and timestamp', () => {
      const action = {
        actionId: '550e8400-e29b-41d4-a716-446655440000',
        intentId: 'INTENT_ALIAS_LIST',
        targetCapability: 'CAP_ALIAS_MANAGE',
        confidence: 0.9,
        slots: {},
        requiresConfirmation: false,
        rawUtteranceSanitized: 'مين في القائمه',
        createdAt: new Date().toISOString(),
      };

      const parsed = StructuredActionSchema.parse(action);
      assert.equal(parsed.actionId, '550e8400-e29b-41d4-a716-446655440000');
    });

    it('should reject invalid UUID actionId', () => {
      const invalid = {
        actionId: 'not-a-uuid',
        intentId: 'INTENT_ALIAS_LIST',
        targetCapability: 'CAP_ALIAS_MANAGE',
        confidence: 0.9,
        slots: {},
        requiresConfirmation: false,
        rawUtteranceSanitized: 'test',
        createdAt: new Date().toISOString(),
      };

      assert.throws(() => StructuredActionSchema.parse(invalid));
    });
  });

  describe('API Request/Response Schemas', () => {
    it('should validate AssistantInterpretRequest', () => {
      const req = {
        sessionId: 'sess_123',
        text: 'بدي اعرف كم الساعه',
        dialectLocale: 'ar-PS-WestBank',
        clientTimestamp: new Date().toISOString(),
        inputModality: 'VOICE_STT',
      };
      assert.doesNotThrow(() => AssistantInterpretRequestSchema.parse(req));
    });

    it('should validate ToolExecuteRequest', () => {
      const req = {
        toolName: 'TOOL_ASSISTANT_QUERY',
        executionGrantToken: 'gt_header.signature',
        parameters: { queryType: 'TIME_DATE' },
      };
      assert.doesNotThrow(() => ToolExecuteRequestSchema.parse(req));
    });

    it('should validate SanadApiError contract', () => {
      const err = {
        errorCode: 'ERR_VALIDATION_FAILED',
        statusCode: 400,
        messageEnglish: 'Schema validation error',
        messageArabic: 'خطأ في التحقق من صحة البيانات',
        timestamp: new Date().toISOString(),
        incidentId: 'inc_12345',
        isRecoverable: true,
      };
      assert.doesNotThrow(() => SanadApiErrorSchema.parse(err));
    });
  });

  describe('i18n and Message Catalog', () => {
    it('should resolve Arabic messages by key', () => {
      const msg = t(MESSAGE_KEYS.POLICY_CAPABILITY_DISABLED, 'ar-PS');
      assert.match(msg, /غير مفعلة حالياً/);
    });

    it('should resolve English messages with fallback', () => {
      const msg = t(MESSAGE_KEYS.POLICY_CAPABILITY_DISABLED, 'en');
      assert.match(msg, /currently disabled/i);
    });

    it('should perform parameter substitution', () => {
      const msg = t(MESSAGE_KEYS.CONFIRM_ALIAS_SET, 'ar-PS', {
        aliasName: 'مرتي',
        targetContact: 'هدى',
      });
      assert.match(msg, /مرتي/);
      assert.match(msg, /هدى/);
    });

    it('should allow dynamic catalog registration', () => {
      defaultCatalogResolver.registerCatalog('fr', {
        [MESSAGE_KEYS.POLICY_ALLOWED]: 'Autorisé avec succès',
      });
      const french = t(MESSAGE_KEYS.POLICY_ALLOWED, 'fr');
      assert.equal(french, 'Autorisé avec succès');
    });
  });

  describe('Capability Gating Governance', () => {
    it('should mark all sensitive capabilities as disabled', () => {
      assert.equal(CAPABILITY_CONFIG.CAP_CONTACT_CALL.enabled, false);
      assert.equal(CAPABILITY_CONFIG.CAP_MESSAGE_SEND.enabled, false);
      assert.equal(CAPABILITY_CONFIG.CAP_LOCATION_READ.enabled, false);
      assert.equal(CAPABILITY_CONFIG.CAP_LOCATION_SHARE.enabled, false);
      assert.equal(CAPABILITY_CONFIG.CAP_CALENDAR_READ.enabled, false);
      assert.equal(CAPABILITY_CONFIG.CAP_CALENDAR_WRITE.enabled, false);
      assert.equal(CAPABILITY_CONFIG.CAP_EMERGENCY_TRIGGER.enabled, false);
    });

    it('should have core assistant capabilities enabled', () => {
      assert.equal(CAPABILITY_CONFIG.CAP_ASSISTANT_QUERY.enabled, true);
      assert.equal(CAPABILITY_CONFIG.CAP_ACTION_CANCEL.enabled, true);
      assert.equal(CAPABILITY_CONFIG.CAP_ALIAS_MANAGE.enabled, true);
    });
  });
});
