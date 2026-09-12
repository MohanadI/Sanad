import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DeterministicIntentClassifier } from '../src/deterministic.js';
import { INTENTS, CAPABILITIES } from '@sanad/common';

describe('DeterministicIntentClassifier', () => {
  const classifier = new DeterministicIntentClassifier();

  const makeRequest = (text: string) => ({
    sessionId: 'sess_test_123',
    text,
    dialectLocale: 'ar-PS-WestBank' as const,
    clientTimestamp: new Date().toISOString(),
    inputModality: 'VOICE_STT' as const,
  });

  describe('Fast-Path Cancel keywords (Highest priority safety override)', () => {
    const cancelKeywords = ['وقف', 'إلغي', 'الغي', 'بلاش', 'اسكت', 'فكك', 'ولا اشي', 'ارجع', 'كافي', 'خلاص'];

    for (const word of cancelKeywords) {
      it(`should recognize "${word}" as INTENT_ACTION_CANCEL with high confidence`, async () => {
        const candidate = await classifier.classify(makeRequest(word));
        assert.equal(candidate.intentId, INTENTS.INTENT_ACTION_CANCEL);
        assert.equal(candidate.targetCapability, CAPABILITIES.CAP_ACTION_CANCEL);
        assert.equal(candidate.requiresConfirmation, false);
        assert.ok(candidate.confidence >= 0.95);
      });
    }
  });

  describe('Affirmative Confirmation keywords', () => {
    const confirmKeywords = ['نعم', 'اه', 'ايوا', 'ماشي', 'تمام', 'موافق', 'اكيد', 'توكل على الله', 'يلا', 'صحيح'];

    for (const word of confirmKeywords) {
      it(`should recognize "${word}" as INTENT_ACTION_CONFIRM`, async () => {
        const candidate = await classifier.classify(makeRequest(word));
        assert.equal(candidate.intentId, INTENTS.INTENT_ACTION_CONFIRM);
        assert.equal(candidate.slots.response, 'AFFIRMATIVE');
      });
    }
  });

  describe('Core Assistant Queries', () => {
    it('should classify time inquiries', async () => {
      const candidate = await classifier.classify(makeRequest('كم الساعة هلقيت'));
      assert.equal(candidate.intentId, INTENTS.INTENT_ASSISTANT_QUERY);
      assert.equal(candidate.targetCapability, CAPABILITIES.CAP_ASSISTANT_QUERY);
      assert.equal(candidate.slots.queryType, 'TIME_DATE');
    });

    it('should classify battery status inquiries', async () => {
      const candidate = await classifier.classify(makeRequest('قديش شحن البطارية'));
      assert.equal(candidate.intentId, INTENTS.INTENT_ASSISTANT_QUERY);
      assert.equal(candidate.slots.queryType, 'BATTERY_STATUS');
    });

    it('should classify general help inquiries', async () => {
      const candidate = await classifier.classify(makeRequest('بدي مساعدة كيف استعمل البرنامج'));
      assert.equal(candidate.intentId, INTENTS.INTENT_ASSISTANT_QUERY);
      assert.equal(candidate.slots.queryType, 'HELP');
    });

    it('should classify system status inquiries', async () => {
      const candidate = await classifier.classify(makeRequest('فحص حالة النظام'));
      assert.equal(candidate.intentId, INTENTS.INTENT_ASSISTANT_QUERY);
      assert.equal(candidate.slots.queryType, 'SYSTEM_STATUS');
    });

    it('should classify call log inquiries', async () => {
      const candidate = await classifier.classify(makeRequest('بدي اعرف مين رن علي اليوم'));
      assert.equal(candidate.intentId, INTENTS.INTENT_ASSISTANT_QUERY);
      assert.equal(candidate.slots.queryType, 'CALL_LOG_STATUS');
    });
  });

  describe('Contact Alias Management', () => {
    it('should classify listing aliases', async () => {
      const candidate = await classifier.classify(makeRequest('مين في القائمة عندي'));
      assert.equal(candidate.intentId, INTENTS.INTENT_ALIAS_LIST);
      assert.equal(candidate.targetCapability, CAPABILITIES.CAP_ALIAS_MANAGE);
    });

    it('should classify setting an alias ("حط لقب مرتي ل هدى")', async () => {
      const candidate = await classifier.classify(makeRequest('حط لقب مرتي ل هدى'));
      assert.equal(candidate.intentId, INTENTS.INTENT_ALIAS_SET);
      assert.equal(candidate.targetCapability, CAPABILITIES.CAP_ALIAS_MANAGE);
      assert.equal(candidate.slots.aliasName, 'مرتي');
      assert.equal(candidate.slots.targetContact, 'هدي'); // Normalized Alif Maqsura
    });

    it('should classify setting an alias ("سمي هدى مرتي")', async () => {
      const candidate = await classifier.classify(makeRequest('سمي هدى مرتي'));
      assert.equal(candidate.intentId, INTENTS.INTENT_ALIAS_SET);
      assert.equal(candidate.slots.aliasName, 'مرتي');
    });

    it('should classify deleting an alias ("احذف اللقب مرتي")', async () => {
      const candidate = await classifier.classify(makeRequest('احذف اللقب مرتي'));
      assert.equal(candidate.intentId, INTENTS.INTENT_ALIAS_DELETE);
      assert.equal(candidate.slots.aliasName, 'مرتي');
      assert.equal(candidate.requiresConfirmation, true);
    });
  });

  describe('Gated capabilities recognition (Must map accurately for safe Policy Engine interception)', () => {
    it('should recognize calling intent ("رن على مرتي")', async () => {
      const candidate = await classifier.classify(makeRequest('رن على مرتي'));
      assert.equal(candidate.intentId, INTENTS.INTENT_CONTACT_CALL);
      assert.equal(candidate.targetCapability, CAPABILITIES.CAP_CONTACT_CALL);
      assert.equal(candidate.slots.targetContact, 'مرتي');
      assert.equal(candidate.requiresConfirmation, true);
    });

    it('should recognize calling intent with dialect variant ("اتصل ب هدى")', async () => {
      const candidate = await classifier.classify(makeRequest('اتصل ب هدى'));
      assert.equal(candidate.intentId, INTENTS.INTENT_CONTACT_CALL);
      assert.equal(candidate.targetCapability, CAPABILITIES.CAP_CONTACT_CALL);
    });

    it('should recognize messaging intent ("ابعت رسالة ل أحمد")', async () => {
      const candidate = await classifier.classify(makeRequest('ابعت رسالة ل أحمد بنص انا في الطريق'));
      assert.equal(candidate.intentId, INTENTS.INTENT_MESSAGE_SEND);
      assert.equal(candidate.targetCapability, CAPABILITIES.CAP_MESSAGE_SEND);
      assert.equal(candidate.requiresConfirmation, true);
    });

    it('should recognize location query ("وين انا هسا")', async () => {
      const candidate = await classifier.classify(makeRequest('وين انا هسا'));
      assert.equal(candidate.intentId, INTENTS.INTENT_LOCATION_QUERY);
      assert.equal(candidate.targetCapability, CAPABILITIES.CAP_LOCATION_READ);
    });

    it('should recognize location sharing ("شارك موقعي مع أحمد")', async () => {
      const candidate = await classifier.classify(makeRequest('شارك موقعي مع أحمد'));
      assert.equal(candidate.intentId, INTENTS.INTENT_LOCATION_SHARE);
      assert.equal(candidate.targetCapability, CAPABILITIES.CAP_LOCATION_SHARE);
      assert.equal(candidate.requiresConfirmation, true);
    });

    it('should recognize emergency keyword ("طوارئ")', async () => {
      const candidate = await classifier.classify(makeRequest('طوارئ ساعدوني'));
      assert.equal(candidate.intentId, INTENTS.INTENT_EMERGENCY_TRIGGER);
      assert.equal(candidate.targetCapability, CAPABILITIES.CAP_EMERGENCY_TRIGGER);
      assert.equal(candidate.requiresConfirmation, true);
    });
  });

  describe('Unrecognized Fallback', () => {
    it('should fallback gracefully to INTENT_UNRECOGNIZED on unknown phrases', async () => {
      const candidate = await classifier.classify(makeRequest('طقس اليوم في كندا'));
      assert.equal(candidate.intentId, INTENTS.INTENT_UNRECOGNIZED);
      assert.equal(candidate.requiresConfirmation, false);
      assert.ok(candidate.confidence < 0.5);
    });
  });

  describe('HMAC-Signed Candidate Token Egress (ADR-006 / Confused Deputy Defense)', () => {
    it('should emit a valid candidateToken bound to the classified intent and capability', async () => {
      const response = await classifier.interpret(makeRequest('كم الساعة هلقيت'));
      assert.equal(response.success, true);
      assert.ok(response.candidateToken?.startsWith('act_'));
      assert.equal(response.actionCandidate.intentId, INTENTS.INTENT_ASSISTANT_QUERY);
      assert.match(response.explanationArabic, /المساعد الصوتي/);
    });
  });
});
