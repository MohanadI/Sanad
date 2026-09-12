/**
 * Palestinian Arabic Dialect Normalization Pipeline
 * Conforms to specifications in docs/product/ARABIC_INTENTS.md
 */

/**
 * Normalizes raw Arabic text by removing diacritics, unifying letter variants,
 * and stripping non-essential punctuation while preserving semantic content.
 */
export function normalizeArabicUtterance(raw: string): string {
  if (!raw) return '';

  return raw
    // 1. Strip Arabic diacritics (Tashkeel: Fatha, Damma, Kasra, Sukun, Shadda, Tanween)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // 2. Normalize Alef variations (أ, إ, آ, ٱ -> ا)
    .replace(/[أإآٱ]/g, 'ا')
    // 3. Normalize Taa Marbuta (ة -> ه)
    .replace(/ة/g, 'ه')
    // 4. Normalize Alif Maqsura to Yaa (ى -> ي)
    .replace(/ى/g, 'ي')
    // 5. Normalize Arabic-Indic digits to standard digits (٠-٩ -> 0-9)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    // 6. Strip Arabic punctuation marks (Arabic comma, semicolon, question mark)
    .replace(/[،؛؟]/g, ' ')
    // 7. Strip other punctuation and non-Arabic/non-alphanumeric characters
    .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
    // 8. Collapse whitespace and trim
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes common Palestinian dialect kinship words to canonical forms.
 * Sets defined in docs/product/ARABIC_INTENTS.md
 */
export const KINSHIP_SYNONYMS: Record<string, string> = {
  // Wife
  مرتي: 'مرتي',
  زوجتي: 'مرتي',
  المدام: 'مرتي',
  ام_العيال: 'مرتي',
  المره: 'مرتي',
  // Husband
  جوزي: 'جوزي',
  زوجي: 'جوزي',
  الزلمه: 'جوزي',
  ابو_العيال: 'جوزي',
  // Father
  ابوي: 'ابوي',
  يابا: 'ابوي',
  الوالد: 'ابوي',
  الحج: 'ابوي',
  // Mother
  امي: 'امي',
  يما: 'امي',
  الوالده: 'امي',
  الحجه: 'امي',
  // Brother / Sister
  اخوي: 'اخوي',
  خيا: 'اخوي',
  اختي: 'اختي',
  خيتي: 'اختي',
};
