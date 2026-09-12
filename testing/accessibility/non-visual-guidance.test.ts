import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Visual metaphors that are strictly forbidden in spoken audio prompts for blind users.
 */
export const FORBIDDEN_VISUAL_METAPHORS = [
  'اضغط على الزر',
  'انظر الى الشاشة',
  'انظر إلى الشاشة',
  'الزر الاخضر',
  'الزر الأحمر',
  'اللون',
  'الايقونة',
  'الأيقونة',
  'كما هو موضح بالشاشة',
  'انقر هنا',
  'المربع الظاهر',
];

export const SYSTEM_PROMPTS_TO_AUDIT = [
  'هل تريد بالتأكيد حذف جميع الألقاب المسجلة لديك؟ قل نعم للمتابعة أو لا للإلغاء.',
  'هذا اللقب موجود مسبقاً لجهة اتصال أخرى. هل تريد استبداله؟ قل نعم أو لا.',
  'الساعة الآن التاسعة وثلاثون دقيقة صباحاً. سند جاهز لمساعدتك.',
  'تم حفظ اللقب مرتي لجهة الاتصال هدى بنجاح.',
  'تم إلغاء العملية بناءً على طلبك.',
  'خاصية إجراء المكالمات الهاتفية غير مفعلة حالياً في هذه النسخة التجريبية حفاظاً على أمانك.',
  'وجدت أكثر من جهة اتصال باسم أحمد: أحمد النجار، وأحمد خليل. أيهما تقصد؟',
  'لم تقم بتفعيل إذن استخدام هذه الخاصية في الإعدادات.',
  'التطبيق يحتاج إلى إذن من نظام الهاتف لمتابعة هذا الطلب.',
  'تعذر الاتصال بالخادم. سيتم حفظ طلبك وإرساله فور عودة الاتصال.',
];

describe('Accessibility Test Suite: Non-Visual Guidance & Spoken Audio Clarity', () => {
  it('should verify zero visual metaphors across all system prompt strings', () => {
    for (const prompt of SYSTEM_PROMPTS_TO_AUDIT) {
      for (const forbidden of FORBIDDEN_VISUAL_METAPHORS) {
        assert.ok(
          !prompt.includes(forbidden),
          `Prompt "${prompt}" contains forbidden visual metaphor "${forbidden}"`
        );
      }
    }
  });

  it('should enforce audio-first choice framing ("قل نعم أو لا") in confirmation prompts', () => {
    const confirmationPrompts = SYSTEM_PROMPTS_TO_AUDIT.filter((p) => p.includes('هل تريد'));

    for (const prompt of confirmationPrompts) {
      const hasAudioChoiceFraming =
        prompt.includes('قل نعم') || prompt.includes('أجب بنعم') || prompt.includes('أيهما تقصد');

      assert.ok(
        hasAudioChoiceFraming,
        `Confirmation prompt "${prompt}" lacks conversational audio choice framing`
      );
    }
  });

  it('should keep confirmation prompts concise (under 25 Arabic words) for screen reader fluency', () => {
    for (const prompt of SYSTEM_PROMPTS_TO_AUDIT) {
      const wordCount = prompt.trim().split(/\s+/).length;
      assert.ok(
        wordCount <= 25,
        `Prompt "${prompt}" is too verbose (${wordCount} words; max is 25)`
      );
    }
  });
});
