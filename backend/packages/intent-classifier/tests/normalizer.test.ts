import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeArabicUtterance } from '../src/normalizer.js';

describe('Arabic Normalizer (normalizeArabicUtterance)', () => {
  it('should strip Arabic diacritics (Harakat / Tashkeel)', () => {
    const raw = 'بَدِّي أَعْرِفْ مِينْ رَنَّ عَلَيَّ';
    const normalized = normalizeArabicUtterance(raw);
    assert.equal(normalized, 'بدي اعرف مين رن علي');
  });

  it('should normalize Alef variants to bare Alef (ا)', () => {
    const raw = 'أحمد إبراهيم آمنة ٱمرأة';
    const normalized = normalizeArabicUtterance(raw);
    assert.equal(normalized, 'احمد ابراهيم امنه امراه');
  });

  it('should normalize Taa Marbuta (ة) to Haa (ه)', () => {
    const raw = 'ساعة بطارية مساعدة';
    const normalized = normalizeArabicUtterance(raw);
    assert.equal(normalized, 'ساعه بطاريه مساعده');
  });

  it('should normalize Alif Maqsura (ى) to Yaa (ي)', () => {
    const raw = 'علي هدى مستشفى';
    const normalized = normalizeArabicUtterance(raw);
    assert.equal(normalized, 'علي هدي مستشفي');
  });

  it('should convert Arabic-Indic digits to standard digits', () => {
    const raw = 'الساعة ٠٩:٣٠';
    const normalized = normalizeArabicUtterance(raw);
    assert.match(normalized, /09/);
    assert.match(normalized, /30/);
  });

  it('should collapse multiple whitespaces and strip punctuation', () => {
    const raw = '  وقف !   ارجع ؟؟   ';
    const normalized = normalizeArabicUtterance(raw);
    assert.equal(normalized, 'وقف ارجع');
  });
});
