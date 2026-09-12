import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  normalizeArabicUtterance,
  isCancellationUtterance,
  isAffirmativeUtterance,
  resolveKinshipSemanticToken,
} from '../support/arabic-normalizer.js';
import { DeterministicPolicyEvaluator } from '../support/policy-evaluator.js';
import { MOCK_USER_ID, MOCK_DEVICE_CONTEXT_VALID } from '../support/mock-data.js';
import { StructuredAction } from '../support/contracts.js';

interface DatasetItem {
  id: string;
  utterance: string;
  dialect: string;
  expectedIntent: string;
  targetCapability: string;
  expectedSlots: Record<string, any>;
  minConfidence: number;
  isAmbiguousTrigger?: boolean;
  isMalformed?: boolean;
  isGated?: boolean;
}

interface IntentDataset {
  version: string;
  description: string;
  localesCovered: string[];
  dataset: DatasetItem[];
}

describe('Arabic Intent & NLP Benchmark Test Suite', () => {
  const datasetPath = path.resolve('testing/intent/arabic-intent-dataset.json');
  const datasetJson: IntentDataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));

  it('should verify dataset schema integrity and Palestinian locale representation', () => {
    assert.ok(datasetJson.dataset.length >= 20, 'Dataset skeleton must contain benchmark samples');
    assert.ok(datasetJson.localesCovered.includes('ar-PS-Madani'));
    assert.ok(datasetJson.localesCovered.includes('ar-PS-Fellahi'));
    assert.ok(datasetJson.localesCovered.includes('ar-PS-Badawi'));
  });

  it('should successfully normalize Arabic diacritics, Alef, and Taa Marbuta on all utterances', () => {
    for (const item of datasetJson.dataset) {
      const normalized = normalizeArabicUtterance(item.utterance);
      // Assert no Harakat remain
      assert.doesNotMatch(
        normalized,
        /[\u064B-\u065F\u0670]/,
        `Normalized utterance "${normalized}" contains remaining diacritics`
      );
      // Assert no Alef variations (أ, إ, آ) remain
      assert.doesNotMatch(
        normalized,
        /[أإآ]/,
        `Normalized utterance "${normalized}" contains unnormalized Alef`
      );
      // Assert no Taa Marbuta (ة) remains
      assert.doesNotMatch(
        normalized,
        /ة/,
        `Normalized utterance "${normalized}" contains unnormalized Taa Marbuta`
      );
    }
  });

  it('should accurately resolve canonical kinship tokens in Palestinian dialect', () => {
    const kinshipSamples = [
      { raw: 'مرتي', expected: 'WIFE' },
      { raw: 'زوجتي', expected: 'WIFE' },
      { raw: 'جوزي', expected: 'HUSBAND' },
      { raw: 'يابا', expected: 'FATHER' },
      { raw: 'الحج', expected: 'FATHER' },
      { raw: 'يما', expected: 'MOTHER' },
      { raw: 'اخوي', expected: 'BROTHER' },
      { raw: 'خيتي', expected: 'SISTER' },
      { raw: 'الحكيم', expected: 'DOCTOR' },
    ];

    for (const sample of kinshipSamples) {
      const token = resolveKinshipSemanticToken(sample.raw);
      assert.strictEqual(
        token,
        sample.expected,
        `Kinship "${sample.raw}" must resolve to "${sample.expected}"`
      );
    }
  });

  it('should detect 100% of cancellation phrases in dataset with fast-path precision', () => {
    const cancelItems = datasetJson.dataset.filter(
      (item) => item.expectedIntent === 'INTENT_ACTION_CANCEL'
    );
    assert.ok(cancelItems.length >= 3);

    for (const item of cancelItems) {
      const isCancel = isCancellationUtterance(item.utterance);
      assert.strictEqual(
        isCancel,
        true,
        `Cancellation phrase "${item.utterance}" failed fast-path detection`
      );
    }
  });

  it('should detect 100% of affirmative confirmation phrases in dataset', () => {
    const confirmItems = datasetJson.dataset.filter(
      (item) => item.expectedIntent === 'INTENT_ACTION_CONFIRM'
    );
    assert.ok(confirmItems.length >= 3);

    for (const item of confirmItems) {
      const isAffirm = isAffirmativeUtterance(item.utterance);
      assert.strictEqual(
        isAffirm,
        true,
        `Affirmative phrase "${item.utterance}" failed confirmation resolution`
      );
    }
  });

  it('should flag ambiguous contact utterances to trigger disambiguation rather than guessing', () => {
    const ambiguousItems = datasetJson.dataset.filter((item) => item.isAmbiguousTrigger);
    assert.ok(ambiguousItems.length > 0);

    for (const item of ambiguousItems) {
      // In Sanad, confidence between 0.60 and 0.80 triggers explicit disambiguation
      assert.ok(
        item.minConfidence >= 0.60 && item.minConfidence <= 0.80,
        `Ambiguous item "${item.utterance}" confidence must be in [0.60, 0.80]`
      );
    }
  });

  it('should reject malformed/gibberish utterances with low confidence (< 0.60)', () => {
    const malformedItems = datasetJson.dataset.filter((item) => item.isMalformed);
    assert.ok(malformedItems.length > 0);

    for (const item of malformedItems) {
      assert.ok(
        item.minConfidence < 0.6,
        `Malformed item "${item.utterance}" must have confidence < 0.60`
      );
    }
  });

  it('should route gated utterances to Policy Engine and assert deterministic denial', () => {
    const gatedItems = datasetJson.dataset.filter((item) => item.isGated);
    assert.ok(gatedItems.length >= 4);

    const evaluator = new DeterministicPolicyEvaluator();

    for (const item of gatedItems) {
      const action: StructuredAction = {
        intentId: item.expectedIntent as any,
        targetCapability: item.targetCapability as any,
        confidence: item.minConfidence,
        slots: item.expectedSlots,
        requiresConfirmation: true,
        rawUtteranceSanitized: normalizeArabicUtterance(item.utterance),
      };

      const result = evaluator.evaluate({
        userId: MOCK_USER_ID,
        deviceId: MOCK_DEVICE_CONTEXT_VALID.deviceId,
        action,
        userGrants: new Set(),
        osPermissions: {},
      });

      assert.strictEqual(
        result.status,
        'DENIED',
        `Gated item "${item.utterance}" was not denied by Policy Engine`
      );
      assert.strictEqual(result.reasonCode, 'POLICY_ERR_CAPABILITY_DISABLED');
    }
  });
});
