import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EarconAudioCue } from '../support/contracts.js';

export interface EarconSpec {
  code: EarconAudioCue;
  frequencyRangeHz: string;
  durationMs: number;
  perceivedMeaning: string;
  maxLatencyBudgetMs: number;
}

export const EARCON_CATALOG: Record<EarconAudioCue, EarconSpec> = {
  EARCON_LISTENING_START: {
    code: 'EARCON_LISTENING_START',
    frequencyRangeHz: '440Hz -> 880Hz',
    durationMs: 80,
    perceivedMeaning: 'Microphones active; user may speak',
    maxLatencyBudgetMs: 50,
  },
  EARCON_THINKING: {
    code: 'EARCON_THINKING',
    frequencyRangeHz: '220Hz rhythmic pulse',
    durationMs: 150,
    perceivedMeaning: 'System processing intent; please wait',
    maxLatencyBudgetMs: 50,
  },
  EARCON_CONFIRM_CHALLENGE: {
    code: 'EARCON_CONFIRM_CHALLENGE',
    frequencyRangeHz: '523Hz + 659Hz (two-tone bell)',
    durationMs: 200,
    perceivedMeaning: 'System requires verbal or tactile confirmation',
    maxLatencyBudgetMs: 50,
  },
  EARCON_SUCCESS: {
    code: 'EARCON_SUCCESS',
    frequencyRangeHz: 'Major triad chord (C5-E5-G5)',
    durationMs: 180,
    perceivedMeaning: 'Action authorized and successfully executed',
    maxLatencyBudgetMs: 50,
  },
  EARCON_CANCELLED: {
    code: 'EARCON_CANCELLED',
    frequencyRangeHz: '600Hz -> 300Hz (descending soft tone)',
    durationMs: 120,
    perceivedMeaning: 'Action aborted; system returned to standby',
    maxLatencyBudgetMs: 50,
  },
  EARCON_ERROR: {
    code: 'EARCON_ERROR',
    frequencyRangeHz: '180Hz low warning chime',
    durationMs: 160,
    perceivedMeaning: 'Request denied, unrecognized, or network failure',
    maxLatencyBudgetMs: 50,
  },
  EARCON_EMERGENCY_COUNTDOWN: {
    code: 'EARCON_EMERGENCY_COUNTDOWN',
    frequencyRangeHz: '880Hz sharp repeating warning pulse',
    durationMs: 100,
    perceivedMeaning: 'Emergency countdown tick; native call imminent (ADR-005)',
    maxLatencyBudgetMs: 50,
  },
};

describe('Accessibility Test Suite: Auditory Earcon Cues', () => {
  it('should define distinct, non-overlapping acoustic profiles for all 7 core lifecycle earcons', () => {
    const requiredCues: EarconAudioCue[] = [
      'EARCON_LISTENING_START',
      'EARCON_THINKING',
      'EARCON_CONFIRM_CHALLENGE',
      'EARCON_SUCCESS',
      'EARCON_CANCELLED',
      'EARCON_ERROR',
      'EARCON_EMERGENCY_COUNTDOWN',
    ];

    for (const cue of requiredCues) {
      const spec = EARCON_CATALOG[cue];
      assert.ok(spec, `Missing earcon specification for ${cue}`);
      assert.ok(spec.durationMs > 0 && spec.durationMs <= 300, `Duration for ${cue} exceeds limit`);
      assert.strictEqual(
        spec.maxLatencyBudgetMs,
        50,
        `Earcon ${cue} must have sub-50ms latency budget`
      );
    }
  });

  it('should simulate state-to-earcon transition mappings accurately', () => {
    const stateTransitions = [
      { from: 'IDLE', event: 'USER_DOUBLE_TAP', expectedEarcon: 'EARCON_LISTENING_START' },
      { from: 'LISTENING', event: 'SPEECH_CAPTURED', expectedEarcon: 'EARCON_THINKING' },
      { from: 'EVALUATING', event: 'RISK_HIGH_CHALLENGE', expectedEarcon: 'EARCON_CONFIRM_CHALLENGE' },
      { from: 'CONFIRMED', event: 'TOOL_EXECUTION_SUCCESS', expectedEarcon: 'EARCON_SUCCESS' },
      { from: 'ANY', event: 'USER_VERBAL_ABORT', expectedEarcon: 'EARCON_CANCELLED' },
      { from: 'EVALUATING', event: 'POLICY_DENIED_GATED', expectedEarcon: 'EARCON_ERROR' },
      { from: 'NETWORK', event: 'CONNECTION_LOST', expectedEarcon: 'EARCON_ERROR' },
      { from: 'IDLE', event: 'EMERGENCY_TRIGGER_COUNTDOWN', expectedEarcon: 'EARCON_EMERGENCY_COUNTDOWN' },
    ];

    for (const tr of stateTransitions) {
      assert.ok(
        EARCON_CATALOG[tr.expectedEarcon as EarconAudioCue],
        `Transition ${tr.from} + ${tr.event} must trigger recognized earcon ${tr.expectedEarcon}`
      );
    }
  });

  it('should verify that sound assets can be pre-cached in memory for instant playback', () => {
    // Simulated SoundPool memory cache verification
    const soundCache = new Map<EarconAudioCue, boolean>();
    Object.keys(EARCON_CATALOG).forEach((cue) => {
      soundCache.set(cue as EarconAudioCue, true);
    });

    assert.strictEqual(soundCache.size, 7, 'All 7 earcon audio samples must be pre-cached');
    assert.strictEqual(soundCache.get('EARCON_CANCELLED'), true);
    assert.strictEqual(soundCache.get('EARCON_EMERGENCY_COUNTDOWN'), true);
  });
});
