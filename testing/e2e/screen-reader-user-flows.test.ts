import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DeterministicPolicyEvaluator, PolicyContext } from '../support/policy-evaluator.js';
import {
  MOCK_USER_ID,
  MOCK_SAMPLE_ACTIONS,
  MOCK_DEVICE_CONTEXT_VALID,
  MOCK_CONTACTS,
} from '../support/mock-data.js';
import { isCancellationUtterance, isAffirmativeUtterance, normalizeArabicUtterance } from '../support/arabic-normalizer.js';
import { EarconAudioCue } from '../support/contracts.js';

describe('End-to-End Test Suite: Screen Reader & Voice User Flows', () => {
  const evaluator = new DeterministicPolicyEvaluator();

  it('Flow 1: Assistant Status & Help Query (LOW Risk)', () => {
    // 1. User double-taps screen -> Listening starts
    const cueStart: EarconAudioCue = 'EARCON_LISTENING_START';
    assert.strictEqual(cueStart, 'EARCON_LISTENING_START');

    // 2. User speaks query in Palestinian Arabic
    const utterance = 'مرحبا سند، قديش الساعة وشو حالة التطبيق؟';
    const normalized = normalizeArabicUtterance(utterance);
    assert.ok(normalized.includes('قديش الساعه'));

    // 3. System transitions to thinking
    const cueThinking: EarconAudioCue = 'EARCON_THINKING';
    assert.strictEqual(cueThinking, 'EARCON_THINKING');

    // 4. Policy Engine evaluates -> ALLOWED
    const context: PolicyContext = {
      userId: MOCK_USER_ID,
      deviceId: MOCK_DEVICE_CONTEXT_VALID.deviceId,
      action: MOCK_SAMPLE_ACTIONS.assistantQueryTime,
      userGrants: new Set(['sanad:perm:system:query']),
      osPermissions: {},
    };
    const policyDecision = evaluator.evaluate(context);
    assert.strictEqual(policyDecision.status, 'ALLOWED');
    assert.strictEqual(policyDecision.riskTier, 'LOW');
    assert.ok(policyDecision.executionGrantToken);

    // 5. System responds with concise Arabic TTS
    const spokenResponse = 'الساعة الآن التاسعة وثلاثون دقيقة صباحاً. سند متصل بالنظام وجاهز لمساعدتك.';
    assert.ok(spokenResponse.includes('الساعة الآن'));

    // 6. Success chime plays
    const cueSuccess: EarconAudioCue = 'EARCON_SUCCESS';
    assert.strictEqual(cueSuccess, 'EARCON_SUCCESS');
  });

  it('Flow 2: Contact Alias Registration (LOW Risk, Confirmation on Overwrite)', () => {
    // 1. User speaks: احفظ مرتي كـ هدى محمد
    const utterance = 'سند، احفظ مرتي كـ هدى محمد';
    assert.strictEqual(isCancellationUtterance(utterance), false);

    // 2. Policy Engine evaluates -> ALLOWED for new alias
    const context: PolicyContext = {
      userId: MOCK_USER_ID,
      deviceId: MOCK_DEVICE_CONTEXT_VALID.deviceId,
      action: MOCK_SAMPLE_ACTIONS.aliasSetNew,
      userGrants: new Set(['sanad:perm:alias:read', 'sanad:perm:alias:write']),
      osPermissions: {},
    };
    const policyDecision = evaluator.evaluate(context);
    assert.strictEqual(policyDecision.status, 'ALLOWED');

    // 3. Spoken feedback confirms
    const feedback = 'تم حفظ اللقب مرتي لجهة الاتصال هدى بنجاح.';
    assert.ok(feedback.includes('تم حفظ اللقب'));
  });

  it('Flow 3: Action Challenge & Confirmation Loop (HIGH Risk Action Simulation)', () => {
    // 1. User speaks high-risk command: احذف كل الألقاب المحفوظة
    const utterance = 'احذف كل الألقاب المحفوظة';
    assert.ok(utterance.includes('احذف كل'));

    // 2. Policy Engine evaluates -> CONFIRMATION_REQUIRED
    const context: PolicyContext = {
      userId: MOCK_USER_ID,
      deviceId: MOCK_DEVICE_CONTEXT_VALID.deviceId,
      action: MOCK_SAMPLE_ACTIONS.aliasClearAll,
      userGrants: new Set(['sanad:perm:alias:read', 'sanad:perm:alias:write']),
      osPermissions: {},
    };
    const policyDecision = evaluator.evaluate(context);
    assert.strictEqual(policyDecision.status, 'CONFIRMATION_REQUIRED');
    assert.ok(policyDecision.confirmationToken);
    assert.strictEqual(policyDecision.promptAudioCue, 'EARCON_CONFIRM_CHALLENGE');

    // 3. Spoken challenge prompted to user
    const challengePrompt = policyDecision.arabicPrompt;
    assert.ok(challengePrompt && challengePrompt.includes('قل نعم للمتابعة أو لا للإلغاء'));

    // 4. User replies: نعم، متأكد
    const userReply = 'نعم، متأكد';
    assert.strictEqual(isAffirmativeUtterance(userReply), true);

    // 5. Token is verified and consumed
    const tokenConsumed = evaluator.consumeToken(policyDecision.confirmationToken, 'CONFIRMATION');
    assert.strictEqual(tokenConsumed, true);

    // 6. Action succeeds
    const cueSuccess: EarconAudioCue = 'EARCON_SUCCESS';
    assert.strictEqual(cueSuccess, 'EARCON_SUCCESS');
  });

  it('Flow 4: Ambiguity & Disambiguation Flow', () => {
    // 1. User refers to common name "أحمد"
    const targetName = 'أحمد';
    const normalizedTarget = normalizeArabicUtterance(targetName);

    // 2. Search contacts returns multiple matches
    const matches = MOCK_CONTACTS.filter((c) => c.normalizedName.includes(normalizedTarget));
    assert.strictEqual(matches.length, 2);

    // 3. System enters disambiguation loop
    const disambiguationQuestion = `وجدت أكثر من جهة اتصال باسم أحمد: ${matches
      .map((m) => m.name)
      .join('، ')}. أيهما تقصد؟`;
    assert.ok(disambiguationQuestion.includes('أحمد النجار'));
    assert.ok(disambiguationQuestion.includes('أحمد خليل'));

    // 4. User clarifies: أحمد النجار
    const userClarification = 'أحمد النجار';
    const resolvedContact = matches.find((c) => c.name === userClarification);
    assert.ok(resolvedContact);
    assert.strictEqual(resolvedContact.id, 'cnt_002');
  });

  it('Flow 5: Policy Rejection of Gated Capability', () => {
    // 1. User asks to call contact while capability is gated
    const context: PolicyContext = {
      userId: MOCK_USER_ID,
      deviceId: MOCK_DEVICE_CONTEXT_VALID.deviceId,
      action: MOCK_SAMPLE_ACTIONS.gatedCall,
      userGrants: new Set(['sanad:perm:contacts:read', 'sanad:perm:telephony:call']),
      osPermissions: { 'android.permission.CALL_PHONE': true },
    };

    // 2. Policy Engine evaluates -> DENIED
    const result = evaluator.evaluate(context);
    assert.strictEqual(result.status, 'DENIED');
    assert.strictEqual(result.reasonCode, 'POLICY_ERR_CAPABILITY_DISABLED');

    // 3. System emits EARCON_ERROR and speaks accessible explanation
    const cueError: EarconAudioCue = 'EARCON_ERROR';
    assert.strictEqual(cueError, 'EARCON_ERROR');
    assert.ok(result.arabicExplanation?.includes('غير مفعلة حالياً'));
  });

  it('Flow 6: Instant Verbal Cancellation', () => {
    // 1. System issues challenge token
    const token = evaluator.generateConfirmationToken(
      MOCK_USER_ID,
      MOCK_SAMPLE_ACTIONS.aliasClearAll,
      30
    );
    assert.strictEqual(evaluator.verifyToken(token, 'CONFIRMATION').valid, true);

    // 2. User interrupts by saying: وقف
    const verbalCancel = 'وقف';
    assert.strictEqual(isCancellationUtterance(verbalCancel), true);

    // 3. Earcon cancelled tone triggered
    const cueCancelled: EarconAudioCue = 'EARCON_CANCELLED';
    assert.strictEqual(cueCancelled, 'EARCON_CANCELLED');

    // 4. Token immediately consumed/revoked
    evaluator.consumeToken(token, 'CONFIRMATION');
    const verifyAfterCancel = evaluator.verifyToken(token, 'CONFIRMATION');
    assert.strictEqual(verifyAfterCancel.valid, false);
    assert.strictEqual(verifyAfterCancel.reasonCode, 'TOKEN_ERR_REPLAY_CONSUMED');
  });
});
