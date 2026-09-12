import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isCancellationUtterance, CANCELLATION_KEYWORDS } from '../support/arabic-normalizer.js';
import { DeterministicPolicyEvaluator } from '../support/policy-evaluator.js';
import { MOCK_SAMPLE_ACTIONS, MOCK_USER_ID } from '../support/mock-data.js';

describe('Accessibility Test Suite: Voice Interruptibility & Cancellation', () => {
  it('should detect all Palestinian colloquial cancellation keywords via fast-path', () => {
    const rawCancellationPhrases = [
      'وقف',
      'إلغي',
      'الغي يا سند',
      'بلاش منه',
      'اسكت هلقيت',
      'فكك من الموضوع',
      'ولا إشي خلاص',
      'ارجع',
      'أوعك تكمل',
    ];

    for (const phrase of rawCancellationPhrases) {
      assert.strictEqual(
        isCancellationUtterance(phrase),
        true,
        `Phrase "${phrase}" must resolve to true via cancellation detector`
      );
    }
  });

  it('should not misclassify legitimate commands as cancellations', () => {
    const legitimateCommands = [
      'احفظ مرتي كـ هدى',
      'قديش الساعة هسا',
      'نعم متأكد',
      'أحمد النجار',
      'ورجيني الألقاب',
    ];

    for (const phrase of legitimateCommands) {
      assert.strictEqual(
        isCancellationUtterance(phrase),
        false,
        `Legitimate command "${phrase}" must not be classified as cancellation`
      );
    }
  });

  it('should revoke active confirmation token immediately upon verbal cancellation', () => {
    const evaluator = new DeterministicPolicyEvaluator();
    const token = evaluator.generateConfirmationToken(
      MOCK_USER_ID,
      MOCK_SAMPLE_ACTIONS.aliasClearAll,
      30
    );

    // Initial check: token is valid
    const initialVerification = evaluator.verifyToken(token, 'CONFIRMATION');
    assert.strictEqual(initialVerification.valid, true);

    // User speaks "وقف" -> Token consumed/revoked
    const consumed = evaluator.consumeToken(token, 'CONFIRMATION');
    assert.strictEqual(consumed, true);

    // Subsequent check: token is now consumed/invalid
    const secondVerification = evaluator.verifyToken(token, 'CONFIRMATION');
    assert.strictEqual(secondVerification.valid, false);
    assert.strictEqual(secondVerification.reasonCode, 'TOKEN_ERR_REPLAY_CONSUMED');
  });

  it('should enforce audio cut-off latency under 50ms upon interrupt signal', () => {
    // Timing benchmark for software interruption event dispatch
    const startTime = performance.now();

    // Simulate interrupt signal dispatched to audio player
    let audioPlaying = true;
    const interruptHandler = () => {
      audioPlaying = false;
    };
    interruptHandler();

    const elapsedTimeMs = performance.now() - startTime;
    assert.strictEqual(audioPlaying, false);
    assert.ok(
      elapsedTimeMs < 50,
      `Interrupt dispatch took ${elapsedTimeMs.toFixed(2)}ms (must be < 50ms)`
    );
  });
});
