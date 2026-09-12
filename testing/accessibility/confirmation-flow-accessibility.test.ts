import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CAPABILITY_CONFIRMATION_RULES,
  CapabilityId,
  t,
  MESSAGE_KEYS,
} from '@sanad/common';

export const FORBIDDEN_VISUAL_METAPHORS = [
  'اضغط',
  'انقر',
  'انظر',
  'الشاشة',
  'شاشة',
  'الزر',
  'الأيقونة',
  'الايقونة',
  'اللون',
  'المرئي',
  'المربع',
  'الرمز الظاهر',
] as const;

export interface ConfirmationPromptSample {
  capability: CapabilityId;
  promptKey: string;
  renderedText: string;
  expectedReadbacks: string[];
}

describe('Accessibility Test Suite: Mandatory Confirmation Flows (ADR-004)', () => {
  const samples: ConfirmationPromptSample[] = [
    {
      capability: 'CAP_ALIAS_MANAGE',
      promptKey: MESSAGE_KEYS.CONFIRM_ALIAS_SET,
      renderedText: t(MESSAGE_KEYS.CONFIRM_ALIAS_SET, 'ar-PS', {
        aliasName: 'مرتي',
        targetContact: 'هدى محمد',
      }),
      expectedReadbacks: ['مرتي', 'هدى محمد'],
    },
    {
      capability: 'CAP_ALIAS_MANAGE',
      promptKey: MESSAGE_KEYS.CONFIRM_ALIAS_DELETE,
      renderedText: t(MESSAGE_KEYS.CONFIRM_ALIAS_DELETE, 'ar-PS', {
        aliasName: 'مرتي',
      }),
      expectedReadbacks: ['مرتي'],
    },
    {
      capability: 'CAP_CONTACT_CALL',
      promptKey: MESSAGE_KEYS.CONFIRM_CONTACT_CALL,
      renderedText: t(MESSAGE_KEYS.CONFIRM_CONTACT_CALL, 'ar-PS', {
        targetContact: 'أحمد خليل',
      }),
      expectedReadbacks: ['أحمد خليل'],
    },
    {
      capability: 'CAP_MESSAGE_SEND',
      promptKey: MESSAGE_KEYS.CONFIRM_MESSAGE_SEND,
      renderedText: t(MESSAGE_KEYS.CONFIRM_MESSAGE_SEND, 'ar-PS', {
        targetContact: 'فاطمة',
        body: 'أنا واصل بعد خمس دقائق',
      }),
      expectedReadbacks: ['فاطمة', 'أنا واصل بعد خمس دقائق'],
    },
    {
      capability: 'CAP_LOCATION_SHARE',
      promptKey: MESSAGE_KEYS.CONFIRM_LOCATION_SHARE,
      renderedText: t(MESSAGE_KEYS.CONFIRM_LOCATION_SHARE, 'ar-PS', {
        targetContact: 'أخي محمود',
      }),
      expectedReadbacks: ['أخي محمود'],
    },
    {
      capability: 'CAP_CALENDAR_WRITE',
      promptKey: MESSAGE_KEYS.CONFIRM_CALENDAR_WRITE,
      renderedText: t(MESSAGE_KEYS.CONFIRM_CALENDAR_WRITE, 'ar-PS', {
        eventTitle: 'مراجعة عيادة العيون',
        startTime: 'غداً العاشرة صباحاً',
      }),
      expectedReadbacks: ['مراجعة عيادة العيون', 'غداً العاشرة صباحاً'],
    },
    {
      capability: 'CAP_LOCATION_READ',
      promptKey: MESSAGE_KEYS.CONFIRM_CHALLENGE_DEFAULT,
      renderedText: t(MESSAGE_KEYS.CONFIRM_CHALLENGE_DEFAULT, 'ar-PS'),
      expectedReadbacks: ['المتابعة'],
    },
    {
      capability: 'CAP_EMERGENCY_TRIGGER',
      promptKey: MESSAGE_KEYS.CONFIRM_EMERGENCY_TRIGGER,
      renderedText: t(MESSAGE_KEYS.CONFIRM_EMERGENCY_TRIGGER, 'ar-PS'),
      expectedReadbacks: ['الطوارئ'],
    },
  ];

  it('should verify that all capabilities with ALWAYS confirmation rule are tested', () => {
    const alwaysCapabilities = (Object.keys(CAPABILITY_CONFIRMATION_RULES) as CapabilityId[]).filter(
      (cap) => CAPABILITY_CONFIRMATION_RULES[cap] === 'ALWAYS'
    );

    for (const cap of alwaysCapabilities) {
      const found = samples.some((s) => s.capability === cap);
      assert.ok(found, `Capability ${cap} requires ALWAYS confirmation but has no sample test`);
    }
  });

  it('should enforce that all confirmation prompts contain complete spoken read-backs of key slots', () => {
    for (const sample of samples) {
      for (const readback of sample.expectedReadbacks) {
        assert.ok(
          sample.renderedText.includes(readback),
          `Prompt for ${sample.capability} (${sample.promptKey}) missing spoken read-back: "${readback}". Rendered text: "${sample.renderedText}"`
        );
      }
    }
  });

  it('should strictly assert ZERO visual metaphors in every confirmation prompt', () => {
    for (const sample of samples) {
      for (const visualTerm of FORBIDDEN_VISUAL_METAPHORS) {
        assert.ok(
          !sample.renderedText.includes(visualTerm),
          `Prompt for ${sample.capability} contains forbidden visual metaphor "${visualTerm}": "${sample.renderedText}"`
        );
      }
    }
  });

  it('should enforce audio-first conversational guidance in all confirmation prompts', () => {
    for (const sample of samples) {
      const hasAudioGuidance =
        sample.renderedText.includes('قل نعم') ||
        sample.renderedText.includes('أجب بنعم') ||
        sample.renderedText.includes('قل إلغاء') ||
        sample.renderedText.includes('هل تريد');

      assert.ok(
        hasAudioGuidance,
        `Prompt for ${sample.capability} lacks audio-first conversational guidance: "${sample.renderedText}"`
      );
    }
  });

  it('should keep confirmation prompts concise (<= 30 words) to ensure rapid screen-reader comprehension', () => {
    for (const sample of samples) {
      const words = sample.renderedText.trim().split(/\s+/).length;
      assert.ok(
        words <= 30,
        `Prompt for ${sample.capability} is too verbose (${words} words): "${sample.renderedText}"`
      );
    }
  });
});
