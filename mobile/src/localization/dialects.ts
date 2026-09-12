import { DialectInfo, DialectLocale } from './types';

export const SUPPORTED_DIALECTS: Record<DialectLocale, DialectInfo> = {
  'ar-PS-WestBank': {
    code: 'ar-PS-WestBank',
    nameArabic: 'اللهجة الفلسطينية - الضفة الغربية',
    nameEnglish: 'Palestinian Arabic (West Bank)',
    description: 'لهجة مدن وقرى الضفة الغربية مثل رام الله، نابلس، والخليل.',
  },
  'ar-PS-Gaza': {
    code: 'ar-PS-Gaza',
    nameArabic: 'اللهجة الفلسطينية - قطاع غزة',
    nameEnglish: 'Palestinian Arabic (Gaza Strip)',
    description: 'لهجة قطاع غزة والساحل الفلسطيني.',
  },
  'ar-PS-Jerusalem': {
    code: 'ar-PS-Jerusalem',
    nameArabic: 'اللهجة الفلسطينية - القدس الشريف',
    nameEnglish: 'Palestinian Arabic (Jerusalem)',
    description: 'لهجة أهل القدس المدنية وضواحيها.',
  },
  'ar-STANDARD': {
    code: 'ar-STANDARD',
    nameArabic: 'اللغة العربية الفصحى المعاصرة',
    nameEnglish: 'Modern Standard Arabic',
    description: 'العربية الفصحى لجميع المستخدمين.',
  },
};

/**
 * Normalizes Palestinian dialect variations into standardized intent matching tokens.
 * Handles common lexical alternations such as:
 * - Time words: هلق / هسا / إسا / إلوقت -> الآن
 * - Desires: بدي / عبالي / حابب -> أريد
 * - Negations: بديش / مابديش -> لا أريد
 * - Questions: شو / إيش -> ماذا
 * - Pronouns and kinship terms: مرتي (زوجتي), أخوي (أخي), سيدي (جدي)
 */
export function normalizePalestinianDialect(text: string): string {
  if (!text) return '';

  let normalized = text.trim();

  // Remove Arabic diacritics (Tashkeel)
  normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '');

  // Normalize Alef forms (أ, إ, آ -> ا)
  normalized = normalized.replace(/[أإآ]/g, 'ا');

  // Normalize Taa Marbuta (ة -> ه)
  normalized = normalized.replace(/ة/g, 'ه');

  // Normalize Yaa (ى -> ي)
  normalized = normalized.replace(/ى/g, 'ي');

  // Palestinian dialect specific replacements (unicode word boundary safe)
  const wordsToMap: [string[], string][] = [
    [['هسا', 'هلق', 'هلقيت', 'اسا', 'هالوقت', 'هلا'], 'الان'],
    [['بديش', 'ما بدي', 'مابدي', 'بدي اياش'], 'لا اريد'],
    [['بدي', 'عبالي', 'حابب', 'بدي ياك'], 'اريد'],
    [['شو', 'ايش', 'وش'], 'ماذا'],
    [['مين', 'منو'], 'من'],
    [['وين', 'فين'], 'اين'],
    [['قديش', 'كم'], 'كم'],
    [['رن', 'اتصل', 'دق'], 'اتصل'],
    [['وقف', 'الغي', 'بلاش', 'سيبك'], 'الغاء'],
    [['اه', 'ايوه', 'نعم', 'مضبوط', 'ماشي', 'اكيد'], 'نعم'],
    [['لا', 'كلا', 'ابدا'], 'لا'],
  ];

  for (const [terms, replacement] of wordsToMap) {
    for (const term of terms) {
      const regex = new RegExp(`(^|\\s)${term}(?=\\s|$)`, 'g');
      normalized = normalized.replace(regex, `$1${replacement}`);
    }
  }

  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}
