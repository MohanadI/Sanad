/**
 * Palestinian Arabic text normalizer matching the architectural specification
 * in docs/product/ARABIC_INTENTS.md.
 */

export function normalizeArabicUtterance(raw: string): string {
  return raw
    // 1. Strip Arabic diacritics (Harakat: Fatha, Damma, Kasra, Sukun, Shadda)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // 2. Normalize Alef variations (أ, إ, آ -> ا)
    .replace(/[أإآ]/g, 'ا')
    // 3. Normalize Taa Marbuta (ة -> ه)
    .replace(/ة/g, 'ه')
    // 4. Normalize Yaa (ى -> ي)
    .replace(/ى/g, 'ي')
    // 5. Strip Arabic punctuation marks (comma, semicolon, question mark)
    .replace(/[،؛؟]/g, ' ')
    // 6. Strip punctuation and excessive whitespace
    .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fast-path abort/cancellation keyword detection.
 * Threshold: >= 0.75 confidence fast-path detection as per ARABIC_INTENTS.md.
 */
export const CANCELLATION_KEYWORDS = [
  'وقف',
  'الغي', // normalized from إلغي
  'الغاء',
  'إلغاء',
  'تراجع',
  'بلاش',
  'اوعك', // normalized from أوعك
  'اسكت',
  'فكك',
  'ولا اشي', // normalized from ولا إشي
  'ارجع',
  'خلاص',
] as const;

export const NORMALIZED_CANCELLATIONS = CANCELLATION_KEYWORDS.map(normalizeArabicUtterance);

export function isCancellationUtterance(raw: string): boolean {
  const normalized = normalizeArabicUtterance(raw);
  return NORMALIZED_CANCELLATIONS.some((kw) => normalized === kw || normalized.startsWith(kw + ' '));
}

/**
 * Fast-path affirmative keywords for challenge confirmation resolution.
 */
export const AFFIRMATIVE_KEYWORDS = [
  'نعم',
  'اه',
  'ايوا',
  'ماشي',
  'تمام',
  'موافق',
  'اكيد',
  'توكل على الله',
  'يلا',
  'صحيح',
] as const;

export const NORMALIZED_AFFIRMATIVES = AFFIRMATIVE_KEYWORDS.map(normalizeArabicUtterance);

export function isAffirmativeUtterance(raw: string): boolean {
  const normalized = normalizeArabicUtterance(raw);
  return NORMALIZED_AFFIRMATIVES.some((kw) => normalized === kw || normalized.startsWith(kw + ' '));
}

/**
 * Canonical kinship mappings for Palestinian dialect.
 */
export const KINSHIP_CANONICAL_MAP: Record<string, string> = {
  مرتي: 'WIFE',
  زوجتي: 'WIFE',
  المدام: 'WIFE',
  'ام العيال': 'WIFE',
  المره: 'WIFE',
  جوزي: 'HUSBAND',
  زوجي: 'HUSBAND',
  الزلمه: 'HUSBAND',
  'ابو العيال': 'HUSBAND',
  ابوي: 'FATHER',
  يابا: 'FATHER',
  الوالد: 'FATHER',
  الحج: 'FATHER',
  امي: 'MOTHER',
  يما: 'MOTHER',
  الوالده: 'MOTHER',
  الحجه: 'MOTHER',
  اخوي: 'BROTHER',
  خيا: 'BROTHER',
  سيدي: 'GRANDFATHER',
  اختي: 'SISTER',
  خيتي: 'SISTER',
  ستي: 'GRANDMOTHER',
  الدكتور: 'DOCTOR',
  الحكيم: 'DOCTOR',
  الشيخ: 'SHEIKH',
  الاستاذ: 'TEACHER',
};

export function resolveKinshipSemanticToken(raw: string): string | null {
  const normalized = normalizeArabicUtterance(raw);
  return KINSHIP_CANONICAL_MAP[normalized] ?? null;
}
