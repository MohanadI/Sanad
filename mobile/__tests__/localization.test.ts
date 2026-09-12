import { i18n, t } from '../src/localization/i18n';
import { normalizePalestinianDialect, SUPPORTED_DIALECTS } from '../src/localization/dialects';

describe('Arabic Localization Foundation', () => {
  describe('i18n Service', () => {
    it('translates core system strings', () => {
      expect(t('app_name')).toBe('سند');
      expect(t('action_listen')).toBe('بدء الاستماع الصوتي');
      expect(t('confirm_cancel')).toBe('إلغاء');
    });

    it('interpolates string parameters', () => {
      // Mock parameter interpolation test
      const formatted = i18n.t('app_name', { any: 'val' });
      expect(formatted).toBe('سند');
    });

    it('formats numbers into Eastern Arabic numerals', () => {
      expect(i18n.formatNumber(123)).toBe('١٢٣');
      expect(i18n.formatNumber(30)).toBe('٣٠');
      expect(i18n.formatNumber(0)).toBe('٠');
    });

    it('manages dialect locale switching', () => {
      expect(i18n.getDialect()).toBe('ar-PS-WestBank');

      i18n.setDialect('ar-PS-Gaza');
      expect(i18n.getDialect()).toBe('ar-PS-Gaza');

      i18n.setDialect('ar-PS-Jerusalem');
      expect(i18n.getDialect()).toBe('ar-PS-Jerusalem');

      i18n.setDialect('ar-STANDARD');
      expect(i18n.getDialect()).toBe('ar-STANDARD');
    });

    it('provides metadata for all supported Palestinian dialects', () => {
      expect(SUPPORTED_DIALECTS['ar-PS-WestBank'].nameArabic).toContain('الضفة الغربية');
      expect(SUPPORTED_DIALECTS['ar-PS-Gaza'].nameArabic).toContain('قطاع غزة');
      expect(SUPPORTED_DIALECTS['ar-PS-Jerusalem'].nameArabic).toContain('القدس');
      expect(SUPPORTED_DIALECTS['ar-STANDARD'].nameArabic).toContain('الفصحى');
    });
  });

  describe('Palestinian Dialect Normalizer', () => {
    it('normalizes temporal dialect words', () => {
      expect(normalizePalestinianDialect('بدي اسافر هسا')).toBe('اريد اسافر الان');
      expect(normalizePalestinianDialect('هلقيت رن علي')).toBe('الان اتصل علي');
      expect(normalizePalestinianDialect('شو الوقت هلق')).toBe('ماذا الوقت الان');
    });

    it('normalizes desire and negation particles', () => {
      expect(normalizePalestinianDialect('بدي اتصل')).toBe('اريد اتصل');
      expect(normalizePalestinianDialect('بديش احكي معه')).toBe('لا اريد احكي معه');
      expect(normalizePalestinianDialect('ما بدي اسوي اشي')).toBe('لا اريد اسوي اشي');
    });

    it('normalizes question words', () => {
      expect(normalizePalestinianDialect('شو في اليوم')).toBe('ماذا في اليوم');
      expect(normalizePalestinianDialect('ايش في مواعيد')).toBe('ماذا في مواعيد');
    });

    it('normalizes cancellation keywords', () => {
      expect(normalizePalestinianDialect('وقف العملية')).toBe('الغاء العمليه');
      expect(normalizePalestinianDialect('إلغي كل اشي')).toBe('الغاء كل اشي');
      expect(normalizePalestinianDialect('بلاش هسا')).toBe('الغاء الان');
    });

    it('strips Arabic diacritics and unifies orthography', () => {
      const withTashkeel = 'سَنَدٌ مُسَاعِدٌ ذَكِيٌّ';
      expect(normalizePalestinianDialect(withTashkeel)).toBe('سند مساعد ذكي');

      const variedAlefs = 'أحمد إبراهيم آدم';
      expect(normalizePalestinianDialect(variedAlefs)).toBe('احمد ابراهيم ادم');
    });
  });
});
